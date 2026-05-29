-- ============================================================================
-- 234: Feed ranker v3 + Top Today v2 — beta-launch readiness
--
-- Additive only: leaves get_ranked_feed_v2 / get_ranked_feed / get_top_today
-- in place as fallbacks. Client tries v3 → v2 → v1; same for Top Today.
--
-- Changes vs v2:
--   1. exclude_post_ids uuid[] parameter — paginates without cursor_ts
--      (cursor_ts in v2 forced strictly-older posts, which broke the freshness
--       boost on page 2+).
--   2. SQL-level hard exclusions: feed_user_actions (not_interested / hide_creator)
--      and blocked_users (both directions). Client filters remain as backup.
--   3. Graduated quick-skip penalty per creator (last 30 days):
--        1 skip   = -5     (post-level discouragement)
--        2 skips  = -15    (mild creator penalty)
--        3+ skips = -30    (strong creator penalty)
--   4. Topic-level skip penalty: hashtags that appear on >=2 quick-skipped posts
--      in last 30 days get -5 each, capped at -25 floor.
--   5. Cold-start cohort: viewers with 0 follows AND 0 likes 90d AND 0 saves 90d
--      get a different score blend:
--        - role/specialty/state affinity (existing)
--        - user_interests overlap (+15 per match on hashtag / specialty / role)
--        - last-24h engagement injection (Top-Today-style)
--        - verified creator + freshness floor kept
--      Returns source='cold_start' so the client / analytics can tag it.
--
-- Top Today v2 changes:
--   - shares ×3, saves ×2.5, comments ×1.5 (down from ×2 to dampen spam),
--     likes ×1, ln(views) ×2  (same baseline).
--   - + ln(unique_viewers + 1) × 2.5   (from public.post_views, last 24h)
--   - + completion_rate × 20           (avg of >5s views, last 24h)
--   - − reports_24h × 15
--   - − not_interested_24h × 8
--   - Viewer-aware exclusions when viewer_uuid is passed (same as v3).
--   - Eligibility filter widened to 'topToday' OR 'forYou' so existing
--     forYou-only posts still surface in Top Today (back-compat).
--
-- Preserved safety filters in BOTH new RPCs:
--   - privacy_mode = 'public' OR creator_id = viewer_id (own private posts visible to author only)
--   - scheduled_status = 'live'
--   - media_processing_status NOT IN ('queued','running','failed')
--   - anonymous redaction still happens client-side in finalizePostsForViewer
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_ranked_feed_v3
-- ----------------------------------------------------------------------------
create or replace function public.get_ranked_feed_v3(
  viewer_id         uuid,
  feed_limit        int          default 50,
  exclude_post_ids  uuid[]       default '{}'::uuid[]
)
returns table (
  post_id uuid,
  score   float,
  source  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id  uuid     := viewer_id;
  v_feed_limit int      := feed_limit;
  v_exclude    uuid[]   := coalesce(exclude_post_ids, '{}'::uuid[]);

  v_role      text;
  v_specialty text;
  v_state     text;

  v_follow_ct int;
  v_like_ct   int;
  v_save_ct   int;
  v_is_cold   boolean;
begin
  if v_viewer_id is null then
    return;
  end if;

  select pr.role, pr.specialty, pr.state
    into v_role, v_specialty, v_state
  from public.profiles pr
  where pr.id = v_viewer_id;

  /* Cold-start detection: no behavioral history at all */
  select count(*) into v_follow_ct
    from public.follows
    where follower_id = v_viewer_id;

  select count(*) into v_like_ct
    from public.post_likes
    where user_id = v_viewer_id
      and created_at >= now() - interval '90 days';

  select count(*) into v_save_ct
    from public.saved_posts
    where user_id = v_viewer_id
      and saved_at >= now() - interval '90 days';

  v_is_cold := (coalesce(v_follow_ct,0) = 0
                and coalesce(v_like_ct,0) = 0
                and coalesce(v_save_ct,0) = 0);

  return query
  with
    /* ---- Viewer exclusion sets (hard filters) ---- */
    hidden_post_ids as (
      select fa.post_id as id
      from public.feed_user_actions fa
      where fa.user_id = v_viewer_id
        and fa.action = 'not_interested'
        and fa.post_id is not null
    ),
    hidden_creator_ids as (
      select distinct cid as id from (
        select fa.creator_id as cid
          from public.feed_user_actions fa
          where fa.user_id = v_viewer_id
            and fa.action = 'hide_creator'
            and fa.creator_id is not null
        union
        select bu.blocked_id as cid
          from public.blocked_users bu
          where bu.blocker_id = v_viewer_id
        union
        select bu.blocker_id as cid
          from public.blocked_users bu
          where bu.blocked_id = v_viewer_id
      ) x
    ),

    /* ---- Personalization signals (zeroed-out branch when cold) ---- */
    followed_creators as (
      select following_id as creator_id
      from public.follows
      where follower_id = v_viewer_id
    ),

    liked_creators as (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),

    saved_creators as (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = v_viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),

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

    /* ---- Graduated skip penalty (count distinct skipped posts per creator) ---- */
    creator_skip_counts as (
      select
        p.creator_id,
        count(distinct pv.post_id)::int as skip_ct
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
      group by p.creator_id
    ),

    /* ---- Topic-level skip penalty (hashtags from repeated skipped posts) ---- */
    skipped_hashtags as (
      select tag, count(*)::int as ct
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pv.viewer_id = v_viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
        and length(trim(tag)) > 0
      group by tag
      having count(*) >= 2
    ),

    /* ---- Cold-start: onboarding interests (user_interests table) ---- */
    viewer_interests as (
      select lower(trim(ui.interest)) as topic
      from public.user_interests ui
      where ui.user_id = v_viewer_id
        and length(trim(coalesce(ui.interest, ''))) > 0
    )

  select
    posts.id as post_id,
    (
      /* ===== Baseline (same as v1/v2) ===== */
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

      /* ===== Personalization (warm cohort only) ===== */
      + case
          when not v_is_cold and exists (
            select 1 from followed_creators fc where fc.creator_id = posts.creator_id
          ) then 30 else 0
        end
      + case
          when not v_is_cold and exists (
            select 1 from liked_creators lc where lc.creator_id = posts.creator_id
          ) then 20 else 0
        end
      + case
          when not v_is_cold and exists (
            select 1 from saved_creators sc where sc.creator_id = posts.creator_id
          ) then 12 else 0
        end
      + case when not v_is_cold then
          (select count(*)::int * 8
             from viewer_top_hashtags vth
             where vth.tag = any (coalesce(posts.hashtags, '{}'::text[])))
        else 0 end
      + case when not v_is_cold then
          coalesce(
            (select cc.rate * 25
               from creator_completion cc
               where cc.creator_id = posts.creator_id),
            0
          )
        else 0 end

      /* ===== Graduated quick-skip penalty (creator-level, always applies) ===== */
      + coalesce(
          (
            select case
              when csc.skip_ct >= 3 then -30
              when csc.skip_ct = 2  then -15
              when csc.skip_ct = 1  then  -5
              else 0
            end
            from creator_skip_counts csc
            where csc.creator_id = posts.creator_id
          ),
          0
        )

      /* ===== Topic-level skip penalty (capped at -25 floor) ===== */
      + greatest(
          -25,
          - (
            select count(*)::int * 5
            from skipped_hashtags sh
            where sh.tag = any (coalesce(posts.hashtags, '{}'::text[]))
          )
        )

      /* ===== Freshness floor (always applies) ===== */
      + case when posts.created_at >= now() - interval '30 minutes' then 40 else 0 end

      /* ===== Cold-start: onboarding interests overlap ===== */
      + case when v_is_cold then
          (
            select count(*)::int * 15
            from viewer_interests vi
            where vi.topic = any (
                    select lower(trim(t))
                    from unnest(coalesce(posts.hashtags, '{}'::text[])) as t
                  )
               or vi.topic = lower(trim(coalesce(posts.specialty_context, '')))
               or vi.topic = lower(trim(coalesce(posts.role_context, '')))
          )
        else 0 end

      /* ===== Cold-start: Top-Today engagement injection (last 24h) ===== */
      + case
          when v_is_cold and posts.created_at >= now() - interval '24 hours' then
            (
              posts.like_count
              + posts.comment_count * 1.5
              + posts.share_count * 3
              + posts.save_count * 2.5
            )::float * 0.5
            + ln(greatest(posts.view_count, 1) + 1) * 4
          else 0
        end
    )::float as score,
    case when v_is_cold then 'cold_start' else 'personalized' end as source
  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  where
    /* feed_type_eligible contains 'forYou' (preserve loose-token tolerance) */
    exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    /* Privacy: public, OR own post (author can see their own private posts in feed) */
    and (
      posts.privacy_mode = 'public'
      or posts.creator_id = v_viewer_id
    )
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running', 'failed')
    )
    /* SQL-level hard exclusions */
    and not exists (select 1 from hidden_post_ids hp where hp.id = posts.id)
    and not exists (select 1 from hidden_creator_ids hc where hc.id = posts.creator_id)
    /* Pagination exclude set */
    and not (posts.id = any (v_exclude))
  order by score desc
  limit greatest(v_feed_limit, 1);
end;
$$;

comment on function public.get_ranked_feed_v3(uuid, int, uuid[]) is
  'Personalized For You ranker (beta v3): adds SQL-level viewer exclusions, exclude_post_ids pagination, graduated quick-skip penalty (creator + topic), and cold-start cohort blend (onboarding interests + Top Today injection). Falls through to v2/v1 client-side.';

grant execute on function public.get_ranked_feed_v3(uuid, int, uuid[]) to authenticated;
grant execute on function public.get_ranked_feed_v3(uuid, int, uuid[]) to anon;

-- ----------------------------------------------------------------------------
-- get_top_today_v2
-- ----------------------------------------------------------------------------
create or replace function public.get_top_today_v2(
  viewer_uuid       uuid         default null,
  feed_limit        int          default 50,
  exclude_post_ids  uuid[]       default '{}'::uuid[]
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
  v_viewer  uuid    := viewer_uuid;
  v_limit   int     := feed_limit;
  v_exclude uuid[]  := coalesce(exclude_post_ids, '{}'::uuid[]);
begin
  return query
  with
    /* Viewer exclusions only resolve when signed in */
    hidden_post_ids as (
      select fa.post_id as id
      from public.feed_user_actions fa
      where v_viewer is not null
        and fa.user_id = v_viewer
        and fa.action = 'not_interested'
        and fa.post_id is not null
    ),
    hidden_creator_ids as (
      select distinct cid as id from (
        select fa.creator_id as cid
          from public.feed_user_actions fa
          where v_viewer is not null
            and fa.user_id = v_viewer
            and fa.action = 'hide_creator'
            and fa.creator_id is not null
        union
        select bu.blocked_id as cid
          from public.blocked_users bu
          where v_viewer is not null and bu.blocker_id = v_viewer
        union
        select bu.blocker_id as cid
          from public.blocked_users bu
          where v_viewer is not null and bu.blocked_id = v_viewer
      ) x
    ),

    /* Last-24h unique viewer count + completion lift, computed once */
    view_quality as (
      select
        pv.post_id,
        count(distinct pv.viewer_id)::int as unique_viewers,
        avg(case when pv.view_duration_ms > 5000 then 1.0 else 0.0 end) as completion_rate
      from public.post_views pv
      where pv.created_at >= now() - interval '24 hours'
      group by pv.post_id
    ),

    /* Last-24h moderation pressure: reports per post (guard: target_id is text in 002) */
    report_counts as (
      select r.target_id::uuid as post_id, count(*)::int as ct
      from public.reports r
      where r.target_type = 'post'
        and r.created_at >= now() - interval '24 hours'
        and r.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      group by r.target_id
    ),

    /* Last-24h Not Interested taps per post */
    ni_counts as (
      select fa.post_id, count(*)::int as ct
      from public.feed_user_actions fa
      where fa.action = 'not_interested'
        and fa.post_id is not null
        and fa.created_at >= now() - interval '24 hours'
      group by fa.post_id
    )

  select
    posts.id as post_id,
    (
      /* ===== Engagement weights (shares > saves > comments > likes) ===== */
      posts.like_count    * 1.0
      + posts.comment_count * 1.5
      + posts.share_count   * 3.0
      + posts.save_count    * 2.5
      + ln(greatest(posts.view_count, 1) + 1) * 2.0
      /* ===== Quality lifts (unique reach + completion) ===== */
      + ln(greatest(coalesce(vq.unique_viewers, 0), 1) + 1) * 2.5
      + coalesce(vq.completion_rate, 0) * 20
      /* ===== Safety penalties ===== */
      - coalesce(rc.ct, 0) * 15
      - coalesce(nic.ct, 0) * 8
    )::float as score
  from public.posts
  left join view_quality   vq  on vq.post_id  = posts.id
  left join report_counts  rc  on rc.post_id  = posts.id
  left join ni_counts      nic on nic.post_id = posts.id
  where
    posts.created_at >= now() - interval '24 hours'
    and posts.privacy_mode = 'public'
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running', 'failed')
    )
    /* Eligible if tagged for either Top Today OR For You (back-compat with existing rows) */
    and exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) in ('topToday', 'forYou')
         or replace(lower(trim(el)), ' ', '') in ('toptoday', 'foryou')
    )
    /* Viewer-aware hard exclusions (when signed in) */
    and (v_viewer is null or not exists (select 1 from hidden_post_ids hp where hp.id = posts.id))
    and (v_viewer is null or not exists (select 1 from hidden_creator_ids hc where hc.id = posts.creator_id))
    /* Pagination exclude set */
    and not (posts.id = any (v_exclude))
  order by score desc
  limit greatest(v_limit, 1);
end;
$$;

comment on function public.get_top_today_v2(uuid, int, uuid[]) is
  'Top Today v2: adds unique-viewer + completion-rate quality lifts, reports/not-interested penalties, optional viewer-aware exclusions, and exclude_post_ids pagination. Falls through to v1 (get_top_today) client-side.';

grant execute on function public.get_top_today_v2(uuid, int, uuid[]) to authenticated;
grant execute on function public.get_top_today_v2(uuid, int, uuid[]) to anon;
