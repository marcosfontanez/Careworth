-- Tier 1 premium For You ranker: viewer-aware personalization.
--
-- Rationale (see chat: "premium feed algorithm" plan).
-- The previous get_ranked_feed (006/020/023) only used viewer profile
-- attributes (role, specialty, state) to personalize -- which means two
-- nurses in California with the same specialty get an identical feed.
-- This v2 reads the viewer's actual behavior (follows, likes, saves,
-- view durations, hashtag preferences) and folds it into the score so
-- each viewer gets a meaningfully different ranking from day one of use.
--
-- Score formula (v2 = v1 + personalization layer):
--
--   BASELINE (kept from v1)
--     +  ranking_score x 10
--     +  engagement velocity x 5      (likes + 2*comments + 3*shares) / age_hours
--     +  recency decay (~12h half-life)        100 * exp(-0.058 * hours)
--     +  log(view_count) x 3
--     +  +15 same role / +20 same specialty / +10 same state
--     +  +8 video / +5 verified
--
--   NEW PERSONALIZATION LAYER (this migration)
--     +  +30  viewer follows the creator                       (strongest explicit signal)
--     +  +20  viewer has previously liked any post by creator  (warm affinity)
--     +  +12  viewer has previously saved any post by creator  (deeper interest)
--     +  +8   per overlapping hashtag with viewer's top-5 liked tags
--     +  +25 * completion_rate   (fraction of viewer's prior views on this creator > 5s)
--     +  -15  viewer skipped (<1.5s view) any post by creator in last 30 days
--     +  +40  post is < 30 minutes old   (freshness floor so brand-new posts can break in)
--
-- All viewer-specific aggregates are computed once in CTEs at the top so the
-- per-row score evaluation is just a series of cheap EXISTS / scalar lookups.
-- All required indexes already exist (post_likes/saved_posts unique constraint
-- gives us (user_id,post_id); idx_follows_follower; idx_post_views_viewer;
-- idx_posts_creator), so this is purely additive -- no schema changes.
--
-- Backwards compatible: old get_ranked_feed remains untouched. The client tries
-- v2 first and falls back to v1 if this migration hasn't been applied yet.

create or replace function public.get_ranked_feed_v2(
  viewer_id   uuid,
  feed_limit  int          default 50,
  cursor_ts   timestamptz  default null
)
returns table (
  post_id uuid,
  score   float
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      text;
  v_specialty text;
  v_state     text;
begin
  select pr.role, pr.specialty, pr.state
  into v_role, v_specialty, v_state
  from public.profiles pr
  where pr.id = viewer_id;

  return query
  with
    /* Creators the viewer explicitly follows -- the loudest signal in any social product. */
    followed_creators as (
      select following_id as creator_id
      from public.follows
      where follower_id = viewer_id
    ),

    /* Distinct creators the viewer has liked any post from (last 90 days for freshness). */
    liked_creators as (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),

    /* Distinct creators the viewer has saved any post from (last 90 days). */
    saved_creators as (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),

    /* Viewer's top 5 hashtags by like count -- their implicit topic preferences.
       We unnest posts.hashtags to count per-tag occurrences. */
    viewer_top_hashtags as (
      select tag, count(*)::int as ct
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pl.user_id = viewer_id
        and pl.created_at >= now() - interval '90 days'
        and length(trim(tag)) > 0
      group by tag
      order by ct desc
      limit 5
    ),

    /* Per-creator completion proxy: fraction of viewer's prior views on this
       creator that lasted > 5s. Captures "I keep watching this creator's stuff
       to the end" without needing actual video duration metadata. */
    creator_completion as (
      select
        p.creator_id,
        sum(case when pv.view_duration_ms > 5000 then 1 else 0 end)::float
          / nullif(count(*), 0)::float as rate
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = viewer_id
        and pv.created_at >= now() - interval '60 days'
      group by p.creator_id
    ),

    /* Soft skip signal: any view < 1500ms on a post by this creator in the
       last 30 days. We treat this as "not for me" and downweight more from
       that creator. Conservative threshold to avoid penalizing accidental swipes. */
    skipped_creators as (
      select distinct p.creator_id
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
    )

  select
    posts.id as post_id,
    (
      /* ---- BASELINE (v1 score, preserved) ---- */
      coalesce(posts.ranking_score, 0) * 10
      + (
          (posts.like_count + posts.comment_count * 2 + posts.share_count * 3)::float
          / greatest(extract(epoch from (now() - posts.created_at)) / 3600, 1)
        ) * 5
      + 100 * exp(-0.058 * extract(epoch from (now() - posts.created_at)) / 3600)
      + ln(greatest(posts.view_count, 1) + 1) * 3
      + case when posts.role_context      = v_role      then 15 else 0 end
      + case when posts.specialty_context = v_specialty then 20 else 0 end
      + case when posts.location_context  = v_state     then 10 else 0 end
      + case when posts.type = 'video'                  then  8 else 0 end
      + case when creator.is_verified                   then  5 else 0 end

      /* ---- NEW PERSONALIZATION LAYER ---- */
      + case
          when exists (
            select 1 from followed_creators fc where fc.creator_id = posts.creator_id
          ) then 30 else 0
        end
      + case
          when exists (
            select 1 from liked_creators lc where lc.creator_id = posts.creator_id
          ) then 20 else 0
        end
      + case
          when exists (
            select 1 from saved_creators sc where sc.creator_id = posts.creator_id
          ) then 12 else 0
        end
      + (
          /* +8 per overlapping hashtag (max 5 -> max +40 contribution). */
          select count(*)::int * 8
          from viewer_top_hashtags vth
          where vth.tag = any (coalesce(posts.hashtags, '{}'::text[]))
        )
      + coalesce(
          (
            select cc.rate * 25
            from creator_completion cc
            where cc.creator_id = posts.creator_id
          ),
          0
        )
      + case
          when exists (
            select 1 from skipped_creators sk where sk.creator_id = posts.creator_id
          ) then -15 else 0
        end
      + case
          when posts.created_at >= now() - interval '30 minutes' then 40 else 0
        end
    )::float as score

  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  where
    /* Same For You eligibility filter as v1 (incl. legacy text variations). */
    exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    /* Public posts always; viewer always sees their own (covers privacy=followers). */
    and (
      posts.privacy_mode = 'public'
      or posts.creator_id = viewer_id
    )
    and (cursor_ts is null or posts.created_at < cursor_ts)
  order by score desc
  limit feed_limit;
end;
$$;

grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to anon;
