-- ============================================================
-- Pulse weekly recap + snapshot counts
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 262_my_pulse_weekly_recap.sql ----------
-- Migration 262 Â· My Pulse weekly recap (owner-only read ritual)
--
-- Single SECURITY DEFINER RPC aggregates the last 7 days of real profile
-- activity for the authenticated owner. No fake metrics; null sections omitted.

create or replace function public.get_my_pulse_weekly_recap(
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_week_start timestamptz := now() - interval '7 days';
  v_month_start timestamptz := now() - interval '35 days';
  v_month_end timestamptz := now() - interval '28 days';
  v_result jsonb := '{}'::jsonb;
  v_top_post jsonb;
  v_most_pulsed jsonb;
  v_most_commented jsonb;
  v_new_followers int := 0;
  v_new_shoutouts int := 0;
  v_pulse_updates int := 0;
  v_featured jsonb;
  v_pulse_score jsonb;
  v_month_ago jsonb;
  v_has_activity boolean := false;
begin
  if v_viewer is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is distinct from v_viewer and not public.viewer_is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- Top moment: highest engagement among eligible posts created this week.
  select jsonb_build_object(
    'kind', 'post',
    'id', p.id,
    'type', p.type,
    'caption', left(trim(coalesce(p.caption, '')), 120),
    'like_count', p.like_count,
    'comment_count', p.comment_count,
    'thumbnail_url', coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), ''))
  )
  into v_top_post
  from public.posts p
  where p.creator_id = p_user_id
    and p.created_at >= v_week_start
    and coalesce(p.is_anonymous, false) = false
    and coalesce(p.scheduled_status, 'live') = 'live'
    and (
      p.media_processing_status is null
      or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
    )
  order by (p.like_count + p.comment_count * 2 + p.share_count) desc, p.created_at desc
  limit 1;

  -- Most pulsed: best like_count among weekly posts OR profile updates.
  with candidates as (
    select
      'post'::text as kind,
      p.id,
      p.type,
      left(trim(coalesce(p.caption, '')), 120) as label,
      p.like_count,
      coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), '')) as thumbnail_url
    from public.posts p
    where p.creator_id = p_user_id
      and p.created_at >= v_week_start
      and coalesce(p.is_anonymous, false) = false
      and coalesce(p.scheduled_status, 'live') = 'live'
      and (
        p.media_processing_status is null
        or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
      )
      and p.like_count > 0
    union all
    select
      'profile_update'::text as kind,
      pu.id,
      pu.type,
      left(trim(coalesce(pu.preview_text, pu.content, '')), 120) as label,
      pu.like_count,
      coalesce(
        nullif(trim(pu.media_thumb), ''),
        case
          when pu.pics_urls is not null and array_length(pu.pics_urls, 1) > 0
            then pu.pics_urls[1]
          else null
        end
      ) as thumbnail_url
    from public.profile_updates pu
    where pu.user_id = p_user_id
      and pu.created_at >= v_week_start
      and pu.like_count > 0
  )
  select jsonb_build_object(
    'kind', c.kind,
    'id', c.id,
    'type', c.type,
    'label', c.label,
    'like_count', c.like_count,
    'thumbnail_url', c.thumbnail_url
  )
  into v_most_pulsed
  from candidates c
  order by c.like_count desc, c.kind asc
  limit 1;

  -- Most commented post this week.
  select jsonb_build_object(
    'kind', 'post',
    'id', p.id,
    'type', p.type,
    'caption', left(trim(coalesce(p.caption, '')), 120),
    'comment_count', p.comment_count,
    'thumbnail_url', coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), ''))
  )
  into v_most_commented
  from public.posts p
  where p.creator_id = p_user_id
    and p.created_at >= v_week_start
    and coalesce(p.is_anonymous, false) = false
    and coalesce(p.scheduled_status, 'live') = 'live'
    and (
      p.media_processing_status is null
      or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
    )
    and p.comment_count > 0
  order by p.comment_count desc, p.created_at desc
  limit 1;

  select count(*)::int
  into v_new_followers
  from public.follows f
  where f.following_id = p_user_id
    and f.created_at >= v_week_start;

  select count(*)::int
  into v_new_shoutouts
  from public.profile_board_shoutouts s
  where s.profile_owner_id = p_user_id
    and s.status = 'active'
    and s.deleted_at is null
    and s.hidden_at is null
    and s.created_at >= v_week_start
    and not exists (
      select 1
      from public.blocked_users bu
      where (
        bu.blocker_id = p_user_id and bu.blocked_id = s.author_id
      ) or (
        bu.blocker_id = s.author_id and bu.blocked_id = p_user_id
      )
    );

  select count(*)::int
  into v_pulse_updates
  from public.profile_updates pu
  where pu.user_id = p_user_id
    and pu.created_at >= v_week_start;

  select jsonb_build_object(
    'id', pu.id,
    'type', pu.type,
    'label', left(trim(coalesce(pu.preview_text, pu.content, '')), 120),
    'created_at', pu.created_at
  )
  into v_featured
  from public.profile_updates pu
  where pu.user_id = p_user_id
    and pu.is_pinned = true
  limit 1;

  select jsonb_build_object(
    'overall', coalesce(pr.pulse_score_current, 0),
    'tier', coalesce(nullif(trim(pr.pulse_tier), ''), 'murmur')
  )
  into v_pulse_score
  from public.profiles pr
  where pr.id = p_user_id;

  -- One month ago highlight (28â€“35 day window), when data exists.
  with candidates as (
    select
      'post'::text as kind,
      p.id,
      left(trim(coalesce(p.caption, '')), 80) as label,
      p.like_count,
      p.created_at
    from public.posts p
    where p.creator_id = p_user_id
      and p.created_at >= v_month_start
      and p.created_at < v_month_end
      and coalesce(p.is_anonymous, false) = false
      and coalesce(p.scheduled_status, 'live') = 'live'
      and (
        p.media_processing_status is null
        or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
      )
    union all
    select
      'profile_update'::text as kind,
      pu.id,
      left(trim(coalesce(pu.preview_text, pu.content, '')), 80) as label,
      pu.like_count,
      pu.created_at
    from public.profile_updates pu
    where pu.user_id = p_user_id
      and pu.created_at >= v_month_start
      and pu.created_at < v_month_end
  )
  select jsonb_build_object(
    'kind', c.kind,
    'id', c.id,
    'label', c.label,
    'like_count', c.like_count,
    'created_at', c.created_at
  )
  into v_month_ago
  from candidates c
  order by c.like_count desc, c.created_at desc
  limit 1;

  v_has_activity :=
    v_top_post is not null
    or v_most_pulsed is not null
    or v_most_commented is not null
    or v_new_followers > 0
    or v_new_shoutouts > 0
    or v_pulse_updates > 0
    or v_featured is not null
    or v_month_ago is not null;

  v_result := jsonb_build_object(
    'week_start', v_week_start,
    'has_activity', v_has_activity,
    'top_moment', v_top_post,
    'most_pulsed', v_most_pulsed,
    'most_commented', v_most_commented,
    'new_followers', v_new_followers,
    'new_shoutouts', v_new_shoutouts,
    'pulse_updates_this_week', v_pulse_updates,
    'featured_moment', v_featured,
    'pulse_score', v_pulse_score,
    'month_ago', v_month_ago
  );

  return v_result;
end;
$$;

comment on function public.get_my_pulse_weekly_recap(uuid) is
  'Owner-only weekly My Pulse recap JSON for the last 7 days. Staff may read any user.';

revoke all on function public.get_my_pulse_weekly_recap(uuid) from public;
grant execute on function public.get_my_pulse_weekly_recap(uuid) to authenticated;


-- ---------- source: 263_pulse_snapshot_recap_counts.sql ----------
-- Migration 263 Â· Pulse Snapshot â€” extend weekly recap RPC with engagement counts

create or replace function public.get_my_pulse_weekly_recap(
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_week_start timestamptz := now() - interval '7 days';
  v_month_start timestamptz := now() - interval '35 days';
  v_month_end timestamptz := now() - interval '28 days';
  v_result jsonb := '{}'::jsonb;
  v_top_post jsonb;
  v_most_pulsed jsonb;
  v_most_commented jsonb;
  v_new_followers int := 0;
  v_new_shoutouts int := 0;
  v_new_comments int := 0;
  v_new_pulses int := 0;
  v_new_media int := 0;
  v_pulse_updates int := 0;
  v_featured jsonb;
  v_pulse_score jsonb;
  v_month_ago jsonb;
  v_has_activity boolean := false;
begin
  if v_viewer is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is distinct from v_viewer and not public.viewer_is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'kind', 'post',
    'id', p.id,
    'type', p.type,
    'caption', left(trim(coalesce(p.caption, '')), 120),
    'like_count', p.like_count,
    'comment_count', p.comment_count,
    'thumbnail_url', coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), ''))
  )
  into v_top_post
  from public.posts p
  where p.creator_id = p_user_id
    and p.created_at >= v_week_start
    and coalesce(p.is_anonymous, false) = false
    and coalesce(p.scheduled_status, 'live') = 'live'
    and (
      p.media_processing_status is null
      or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
    )
  order by (p.like_count + p.comment_count * 2 + p.share_count) desc, p.created_at desc
  limit 1;

  with candidates as (
    select
      'post'::text as kind,
      p.id,
      p.type,
      left(trim(coalesce(p.caption, '')), 120) as label,
      p.like_count,
      coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), '')) as thumbnail_url
    from public.posts p
    where p.creator_id = p_user_id
      and p.created_at >= v_week_start
      and coalesce(p.is_anonymous, false) = false
      and coalesce(p.scheduled_status, 'live') = 'live'
      and (
        p.media_processing_status is null
        or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
      )
      and p.like_count > 0
    union all
    select
      'profile_update'::text as kind,
      pu.id,
      pu.type,
      left(trim(coalesce(pu.preview_text, pu.content, '')), 120) as label,
      pu.like_count,
      coalesce(
        nullif(trim(pu.media_thumb), ''),
        case
          when pu.pics_urls is not null and array_length(pu.pics_urls, 1) > 0
            then pu.pics_urls[1]
          else null
        end
      ) as thumbnail_url
    from public.profile_updates pu
    where pu.user_id = p_user_id
      and pu.created_at >= v_week_start
      and pu.like_count > 0
  )
  select jsonb_build_object(
    'kind', c.kind,
    'id', c.id,
    'type', c.type,
    'label', c.label,
    'like_count', c.like_count,
    'thumbnail_url', c.thumbnail_url
  )
  into v_most_pulsed
  from candidates c
  order by c.like_count desc, c.kind asc
  limit 1;

  select jsonb_build_object(
    'kind', 'post',
    'id', p.id,
    'type', p.type,
    'caption', left(trim(coalesce(p.caption, '')), 120),
    'comment_count', p.comment_count,
    'thumbnail_url', coalesce(nullif(trim(p.thumbnail_url), ''), nullif(trim(p.media_url), ''))
  )
  into v_most_commented
  from public.posts p
  where p.creator_id = p_user_id
    and p.created_at >= v_week_start
    and coalesce(p.is_anonymous, false) = false
    and coalesce(p.scheduled_status, 'live') = 'live'
    and (
      p.media_processing_status is null
      or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
    )
    and p.comment_count > 0
  order by p.comment_count desc, p.created_at desc
  limit 1;

  select count(*)::int into v_new_followers
  from public.follows f
  where f.following_id = p_user_id and f.created_at >= v_week_start;

  select count(*)::int into v_new_shoutouts
  from public.profile_board_shoutouts s
  where s.profile_owner_id = p_user_id
    and s.status = 'active'
    and s.deleted_at is null
    and s.hidden_at is null
    and s.created_at >= v_week_start
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = p_user_id and bu.blocked_id = s.author_id)
         or (bu.blocker_id = s.author_id and bu.blocked_id = p_user_id)
    );

  select count(*)::int into v_new_comments
  from (
    select c.id
    from public.comments c
    join public.posts p on p.id = c.post_id
    where p.creator_id = p_user_id
      and c.created_at >= v_week_start
      and coalesce(p.is_anonymous, false) = false
    union all
    select puc.id
    from public.profile_update_comments puc
    join public.profile_updates pu on pu.id = puc.update_id
    where pu.user_id = p_user_id
      and puc.created_at >= v_week_start
  ) engaged_comments;

  select count(*)::int into v_new_pulses
  from (
    select pl.id
    from public.post_likes pl
    join public.posts p on p.id = pl.post_id
    where p.creator_id = p_user_id
      and pl.created_at >= v_week_start
      and coalesce(p.is_anonymous, false) = false
    union all
    select pul.id
    from public.profile_update_likes pul
    join public.profile_updates pu on pu.id = pul.update_id
    where pu.user_id = p_user_id
      and pul.created_at >= v_week_start
  ) engaged_pulses;

  select count(*)::int into v_new_media
  from (
    select p.id
    from public.posts p
    where p.creator_id = p_user_id
      and p.created_at >= v_week_start
      and p.type = 'image'
      and coalesce(p.is_anonymous, false) = false
      and coalesce(p.scheduled_status, 'live') = 'live'
      and (
        p.media_processing_status is null
        or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed')
      )
    union all
    select pu.id
    from public.profile_updates pu
    where pu.user_id = p_user_id
      and pu.created_at >= v_week_start
      and pu.type = 'pics'
  ) media_items;

  select count(*)::int into v_pulse_updates
  from public.profile_updates pu
  where pu.user_id = p_user_id and pu.created_at >= v_week_start;

  select jsonb_build_object(
    'id', pu.id,
    'type', pu.type,
    'label', left(trim(coalesce(pu.preview_text, pu.content, '')), 120),
    'created_at', pu.created_at
  )
  into v_featured
  from public.profile_updates pu
  where pu.user_id = p_user_id and pu.is_pinned = true
  limit 1;

  select jsonb_build_object(
    'overall', coalesce(pr.pulse_score_current, 0),
    'tier', coalesce(nullif(trim(pr.pulse_tier), ''), 'murmur')
  )
  into v_pulse_score
  from public.profiles pr
  where pr.id = p_user_id;

  with candidates as (
    select 'post'::text as kind, p.id,
      left(trim(coalesce(p.caption, '')), 80) as label, p.like_count, p.created_at
    from public.posts p
    where p.creator_id = p_user_id
      and p.created_at >= v_month_start and p.created_at < v_month_end
      and coalesce(p.is_anonymous, false) = false
      and coalesce(p.scheduled_status, 'live') = 'live'
      and (p.media_processing_status is null
        or lower(trim(p.media_processing_status)) not in ('queued', 'running', 'failed'))
    union all
    select 'profile_update'::text, pu.id,
      left(trim(coalesce(pu.preview_text, pu.content, '')), 80), pu.like_count, pu.created_at
    from public.profile_updates pu
    where pu.user_id = p_user_id
      and pu.created_at >= v_month_start and pu.created_at < v_month_end
  )
  select jsonb_build_object(
    'kind', c.kind, 'id', c.id, 'label', c.label,
    'like_count', c.like_count, 'created_at', c.created_at
  )
  into v_month_ago
  from candidates c
  order by c.like_count desc, c.created_at desc
  limit 1;

  v_has_activity :=
    v_top_post is not null
    or v_most_pulsed is not null
    or v_most_commented is not null
    or v_new_followers > 0
    or v_new_shoutouts > 0
    or v_new_comments > 0
    or v_new_pulses > 0
    or v_new_media > 0
    or v_pulse_updates > 0
    or v_featured is not null
    or (v_month_ago is not null and coalesce((v_month_ago->>'like_count')::int, 0) > 0);

  v_result := jsonb_build_object(
    'week_start', v_week_start,
    'has_activity', v_has_activity,
    'top_moment', v_top_post,
    'most_pulsed', v_most_pulsed,
    'most_commented', v_most_commented,
    'new_followers', v_new_followers,
    'new_shoutouts', v_new_shoutouts,
    'new_comments', v_new_comments,
    'new_pulses', v_new_pulses,
    'new_media', v_new_media,
    'pulse_updates_this_week', v_pulse_updates,
    'featured_moment', v_featured,
    'pulse_score', v_pulse_score,
    'month_ago', v_month_ago
  );

  return v_result;
end;
$$;

comment on function public.get_my_pulse_weekly_recap(uuid) is
  'Owner-only weekly My Pulse recap / Pulse Snapshot JSON for the last 7 days.';


