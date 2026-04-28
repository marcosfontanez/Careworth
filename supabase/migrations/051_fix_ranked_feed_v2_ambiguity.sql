-- Fix: get_ranked_feed_v2 threw "column reference viewer_id is ambiguous"
-- which caused the client to permanently fall back to v1 (see log:
-- `get_ranked_feed_v2 unavailable, falling back to v1: column reference
-- "viewer_id" is ambiguous`).
--
-- Root cause: inside the `creator_completion` and `skipped_creators` CTEs
-- the predicate `pv.viewer_id = viewer_id` is parsed in a scope where
-- `post_views.viewer_id` (via the `pv` alias) is also visible as a bare
-- `viewer_id`. Postgres refuses to choose between the column and the
-- function parameter of the same name.
--
-- Fix: keep the RPC signature exactly the same (client still calls
-- `supabase.rpc('get_ranked_feed_v2', { viewer_id, feed_limit })`), but
-- copy the parameter into a local variable `v_viewer_id` at the top of
-- the function body and use that local everywhere inside SQL. A local
-- declared variable shares no name with any column, so the ambiguity
-- cannot reappear.
--
-- This migration is idempotent — `create or replace` preserves grants.

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
  -- Local aliases so SQL inside the CTEs never has to disambiguate the
  -- parameter against a same-named column (notably post_views.viewer_id).
  v_viewer_id uuid        := viewer_id;
  v_feed_limit int        := feed_limit;
  v_cursor_ts  timestamptz := cursor_ts;

  v_role      text;
  v_specialty text;
  v_state     text;
begin
  select pr.role, pr.specialty, pr.state
  into v_role, v_specialty, v_state
  from public.profiles pr
  where pr.id = v_viewer_id;

  return query
  with
    /* Creators the viewer explicitly follows. */
    followed_creators as (
      select following_id as creator_id
      from public.follows
      where follower_id = v_viewer_id
    ),

    /* Distinct creators the viewer has liked any post from (last 90 days). */
    liked_creators as (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),

    /* Distinct creators the viewer has saved any post from (last 90 days). */
    saved_creators as (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = v_viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),

    /* Viewer's top 5 hashtags by like count. */
    viewer_top_hashtags as (
      select tag, count(*)::int as ct
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
        and length(trim(tag)) > 0
      group by tag
      order by ct desc
      limit 5
    ),

    /* Per-creator completion proxy. `pv.viewer_id = v_viewer_id` here is
       the formerly-ambiguous comparison — now unambiguous because the
       right-hand side is a local variable rather than the parameter. */
    creator_completion as (
      select
        p.creator_id,
        sum(case when pv.view_duration_ms > 5000 then 1 else 0 end)::float
          / nullif(count(*), 0)::float as rate
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.created_at >= now() - interval '60 days'
      group by p.creator_id
    ),

    /* Soft skip signal. Also formerly-ambiguous; fixed by the local. */
    skipped_creators as (
      select distinct p.creator_id
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
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

      /* ---- PERSONALIZATION LAYER ---- */
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
    /* Same For You eligibility filter as v1. */
    exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    and (
      posts.privacy_mode = 'public'
      or posts.creator_id = v_viewer_id
    )
    and (v_cursor_ts is null or posts.created_at < v_cursor_ts)
  order by score desc
  limit v_feed_limit;
end;
$$;

grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to anon;
