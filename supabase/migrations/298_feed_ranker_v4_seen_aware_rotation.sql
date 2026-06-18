-- ============================================================
-- Feed ranker v4 seen-aware rotation
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 278_feed_ranker_v4_seen_aware_rotation.sql ----------
-- ============================================================================
-- 278: Feed ranker v4 â€” seen-aware rotation + per-open variety
--
-- Additive only: leaves get_ranked_feed_v3 / v2 / v1 in place as fallbacks.
-- Client tries v4 â†’ v3 â†’ v2 â†’ v1.
--
-- Goal (user request): the For You feed should feel different every time the app
-- is opened, and should NOT replay a video the viewer has already watched â€”
-- UNLESS there isn't much other content, in which case watched posts may reappear
-- (rotated so the least-recently-seen come back first).
--
-- Changes vs v3:
--   1. SEEN-AWARE RANKING (soft exclude + backfill):
--        A post is "seen" if, within the last `seen_lookback_days` (default 14),
--        the viewer either:
--          - watched it for >= 2000ms (a genuine view, not an accidental swipe), OR
--          - liked it (you clearly saw it).
--        Seen posts get a large negative penalty (-100000) so EVERY unseen post
--        outranks EVERY seen post. We do NOT hard-filter them, so when unseen
--        content runs low the feed backfills with seen posts instead of going
--        empty. Among seen posts, the least-recently-seen score higher (a small
--        +hours-since-seen term) so re-shows rotate instead of repeating.
--   2. PER-OPEN VARIETY (jitter):
--        + random() * `jitter_strength` (default 25). Big enough to reshuffle
--        posts of similar quality on each fetch (so opening the app twice gives a
--        different order), small enough that strong signals (follow +30, recency
--        up to +100, freshness +40) still win. The jitter is added to the
--        returned score, and the seen penalty dwarfs it, so jitter never lifts a
--        seen post above an unseen one.
--   3. source column: 'reshown' (seen backfill) | 'cold_start' | 'personalized'.
--
-- Everything else (baseline scorer, personalization layer, graduated skip
-- penalties, cold-start cohort, hard exclusions, privacy/processing filters,
-- exclude_post_ids pagination) is preserved verbatim from v3.
-- ============================================================================

-- Speeds up the per-viewer "seen" lookup (viewer_id + recency + post_id).
create index if not exists idx_post_views_viewer_created
  on public.post_views (viewer_id, created_at);
create index if not exists idx_post_views_viewer_post
  on public.post_views (viewer_id, post_id);

create or replace function public.get_ranked_feed_v4(
  viewer_id          uuid,
  feed_limit         int          default 50,
  exclude_post_ids   uuid[]       default '{}'::uuid[],
  seen_lookback_days int          default 14,
  jitter_strength    float        default 25
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
  v_seen_days  int      := greatest(coalesce(seen_lookback_days, 14), 1);
  v_jitter     float    := greatest(coalesce(jitter_strength, 25), 0);

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

    /* ---- SEEN set: genuine views (>=2s) OR likes, within lookback window ----
       last_seen drives the rotation tie-breaker for backfilled re-shows. */
    seen_posts as (
      select s.post_id, max(s.seen_at) as last_seen
      from (
        select pv.post_id, pv.created_at as seen_at
          from public.post_views pv
          where pv.viewer_id = v_viewer_id
            and pv.view_duration_ms >= 2000
            and pv.created_at >= now() - (v_seen_days || ' days')::interval
        union all
        select pl.post_id, pl.created_at as seen_at
          from public.post_likes pl
          where pl.user_id = v_viewer_id
            and pl.created_at >= now() - (v_seen_days || ' days')::interval
      ) s
      group by s.post_id
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
      /* ===== Baseline (same as v1/v2/v3) ===== */
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

      /* ===== SEEN penalty + rotation (NEW in v4) =====
         Seen posts sink below ALL unseen posts (-100000). Among seen, the
         least-recently-seen float to the top of the seen band (+hours since
         seen, capped ~30 days) so re-shows rotate. */
      + coalesce(
          (
            select -100000
                   + least(
                       extract(epoch from (now() - sp.last_seen)) / 3600.0,
                       720
                     ) * 0.5
            from seen_posts sp
            where sp.post_id = posts.id
          ),
          0
        )

      /* ===== Per-open variety jitter (NEW in v4) ===== */
      + random() * v_jitter
    )::float as score,
    case
      when exists (select 1 from seen_posts sp where sp.post_id = posts.id) then 'reshown'
      when v_is_cold then 'cold_start'
      else 'personalized'
    end as source
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

comment on function public.get_ranked_feed_v4(uuid, int, uuid[], int, float) is
  'Personalized For You ranker (v4): v3 + seen-aware soft exclusion with backfill (do not replay watched/liked posts unless content is scarce; re-shows rotate least-recently-seen first) + per-open jitter for variety. Falls through to v3/v2/v1 client-side.';

grant execute on function public.get_ranked_feed_v4(uuid, int, uuid[], int, float) to authenticated;
grant execute on function public.get_ranked_feed_v4(uuid, int, uuid[], int, float) to anon;


