-- ============================================================================
-- PARKED as migration 181 — NOT production-approved yet (output-equivalence +
-- performance validation pending). Renumbered out of the 178 slot so security
-- migrations 177, 179, 180, and 182 can ship without applying this feed change.
--
-- Original note:
-- 178: get_ranked_feed_v2 — planner-friendly CTE boundaries + join lookups
--
-- Problem (auto_explain): viewer_top_hashtags and creator_completion showed up as
-- nested SubPlans with loops ≈ output rows, i.e. work was tied to each scored
-- candidate post. Default CTE inlining can merge those definitions into per-row
-- subplans even though they only depend on v_viewer_id.
--
-- Approach (semantics unchanged):
-- 1) Mark viewer-scoped CTEs AS MATERIALIZED so Postgres computes each relation
--    once per query instead of inlining the full defining subtree into each row.
-- 2) Replace the scalar subquery on creator_completion with a LEFT JOIN and
--    coalesce(cc.rate * 25, 0) — same cardinality (one row per creator in CTE).
-- 3) Replace EXISTS(...) semi-queries on small creator-id sets with LEFT JOIN +
--    IS NOT NULL checks — same booleans, friendlier to hash/semi-join plans.
--
-- Scoring weights, filters (privacy / scheduled / media_processing / forYou),
-- ORDER BY score DESC, LIMIT, and signature are unchanged.
-- ============================================================================

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
    followed_creators as materialized (
      select following_id as creator_id
      from public.follows
      where follower_id = v_viewer_id
    ),

    liked_creators as materialized (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),

    saved_creators as materialized (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = v_viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),

    viewer_top_hashtags as materialized (
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

    creator_completion as materialized (
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

    skipped_creators as materialized (
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

      + case when fc.creator_id is not null then 30 else 0 end
      + case when lc.creator_id is not null then 20 else 0 end
      + case when sc.creator_id is not null then 12 else 0 end
      + (
          select count(*)::int * 8
          from viewer_top_hashtags vth
          where vth.tag = any (coalesce(posts.hashtags, '{}'::text[]))
        )
      + coalesce(cc.rate * 25, 0)
      + case when sk.creator_id is not null then -15 else 0 end
      + case
          when posts.created_at >= now() - interval '30 minutes' then 40 else 0
        end
    )::float as score

  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  left join followed_creators fc on fc.creator_id = posts.creator_id
  left join liked_creators lc on lc.creator_id = posts.creator_id
  left join saved_creators sc on sc.creator_id = posts.creator_id
  left join skipped_creators sk on sk.creator_id = posts.creator_id
  left join creator_completion cc on cc.creator_id = posts.creator_id
  where
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
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running')
    )
    and (v_cursor_ts is null or posts.created_at < v_cursor_ts)
  order by score desc
  limit v_feed_limit;
end;
$$;

comment on function public.get_ranked_feed_v2(uuid, int, timestamptz) is
  'Personalized For You ranked feed v2. 178: MATERIALIZED viewer CTEs + JOIN creator/signal lookups to avoid per-row CTE subplans (same scoring as 160).';

grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to anon;
