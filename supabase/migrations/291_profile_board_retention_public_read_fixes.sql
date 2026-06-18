-- ============================================================
-- Pulse Board retention, public-by-default, read fixes
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 264_pulse_board_retention.sql ----------
-- Migration 264 Â· Pulse Board retention & display rules
--
-- Public: latest 30 active non-archived (+ pinned)
-- Floating pool (client): latest 12 unpinned, max 2 per author
-- Owner management: latest 100 active (includes archived)
-- Auto-archive unpinned shoutouts older than 90 days (no hard delete)

alter table public.profile_board_shoutouts
  add column if not exists archived_at timestamptz null;

comment on column public.profile_board_shoutouts.archived_at is
  'Set when an unpinned shoutout ages out of public display (90d). Owner can still manage.';

create index if not exists idx_profile_board_shoutouts_owner_public
  on public.profile_board_shoutouts (profile_owner_id, created_at desc)
  where status = 'active'
    and deleted_at is null
    and hidden_at is null
    and archived_at is null;

create index if not exists idx_profile_board_shoutouts_owner_manage
  on public.profile_board_shoutouts (profile_owner_id, created_at desc)
  where status = 'active'
    and deleted_at is null
    and hidden_at is null;

-- ---------------------------------------------------------------------------
-- Lazy auto-archive (V1 â€” no hard delete)
-- ---------------------------------------------------------------------------
create or replace function public.apply_pulse_board_auto_archive(p_profile_owner_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.profile_board_shoutouts
     set archived_at = now()
   where profile_owner_id = p_profile_owner_id
     and pinned_at is null
     and archived_at is null
     and status = 'active'
     and deleted_at is null
     and hidden_at is null
     and created_at < now() - interval '90 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.apply_pulse_board_auto_archive(uuid) is
  'Marks aged unpinned Pulse Board shoutouts as archived (public display only).';

-- ---------------------------------------------------------------------------
-- List RPC â€” pinned + capped unpinned items
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_board_shoutouts(p_profile_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_is_owner boolean := v_viewer is not null and v_viewer = p_profile_owner_id;
  v_is_staff boolean := public.viewer_is_staff();
  v_board_enabled boolean := true;
  v_pinned jsonb;
  v_items jsonb;
  v_limit integer;
begin
  if p_profile_owner_id is null then
    raise exception 'profile required' using errcode = '22000';
  end if;

  if not v_is_owner and not v_is_staff then
    if not public.viewer_can_read_profile_surface(p_profile_owner_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;

    select coalesce(pr.pulse_board_enabled, true)
      into v_board_enabled
    from public.profiles pr
    where pr.id = p_profile_owner_id;

    if not v_board_enabled then
      return jsonb_build_object(
        'pinned', null,
        'items', '[]'::jsonb,
        'is_owner_view', false
      );
    end if;
  end if;

  perform public.apply_pulse_board_auto_archive(p_profile_owner_id);

  select to_jsonb(row)
    into v_pinned
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is not null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
    order by s.pinned_at desc
    limit 1
  ) row;

  v_limit := case when v_is_owner or v_is_staff then 100 else 30 end;

  select coalesce(jsonb_agg(to_jsonb(row) order by row.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
      and (
        v_is_owner
        or v_is_staff
        or s.archived_at is null
      )
    order by s.created_at desc
    limit v_limit
  ) row;

  return jsonb_build_object(
    'pinned', v_pinned,
    'items', coalesce(v_items, '[]'::jsonb),
    'is_owner_view', v_is_owner or v_is_staff
  );
end;
$$;

comment on function public.get_profile_board_shoutouts(uuid) is
  'Pulse Board feed: pinned shoutout + capped unpinned list (public 30, owner 100).';

grant execute on function public.get_profile_board_shoutouts(uuid) to authenticated, anon;
grant execute on function public.apply_pulse_board_auto_archive(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Pin / unpin â€” respect archive rules
-- ---------------------------------------------------------------------------
create or replace function public.moderate_profile_board_shoutout(
  p_shoutout_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.profile_board_shoutouts;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_row
    from public.profile_board_shoutouts
   where id = p_shoutout_id;

  if v_row.id is null then
    raise exception 'shoutout not found' using errcode = '22000';
  end if;

  if v_action = 'author_delete' then
    if v_row.author_id <> v_user then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now(), hidden_at = null, pinned_at = null
     where id = p_shoutout_id;
    return;
  end if;

  if v_row.profile_owner_id <> v_user and not public.viewer_is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_action = 'hide' then
    update public.profile_board_shoutouts
       set status = 'hidden', hidden_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'delete' then
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'report' then
    update public.profile_board_shoutouts
       set status = 'reported', reported_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'pin' then
    if v_row.status <> 'active' or v_row.deleted_at is not null or v_row.hidden_at is not null then
      raise exception 'shoutout not found' using errcode = '22000';
    end if;
    update public.profile_board_shoutouts
       set pinned_at = null
     where profile_owner_id = v_row.profile_owner_id
       and pinned_at is not null
       and id <> p_shoutout_id;
    update public.profile_board_shoutouts
       set pinned_at = now(), archived_at = null
     where id = p_shoutout_id;
  elsif v_action = 'unpin' then
    update public.profile_board_shoutouts
       set
         pinned_at = null,
         archived_at = case
           when created_at < now() - interval '90 days' then coalesce(archived_at, now())
           else null
         end
     where id = p_shoutout_id
       and profile_owner_id = v_row.profile_owner_id;
  else
    raise exception 'invalid action' using errcode = '22000';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS â€” public reads exclude archived; owner reads include archived
-- ---------------------------------------------------------------------------
drop policy if exists "Pulse board shoutouts readable on visible profiles"
  on public.profile_board_shoutouts;
create policy "Pulse board shoutouts readable on visible profiles"
  on public.profile_board_shoutouts for select
  using (
    status = 'active'
    and deleted_at is null
    and hidden_at is null
    and archived_at is null
    and public.viewer_can_read_profile_surface(profile_owner_id)
    and coalesce(
      (select pr.pulse_board_enabled from public.profiles pr where pr.id = profile_owner_id),
      true
    )
  );

drop policy if exists "Pulse board owner reads own board"
  on public.profile_board_shoutouts;
create policy "Pulse board owner reads own board"
  on public.profile_board_shoutouts for select
  using (
    (select auth.uid()) = profile_owner_id
    and status = 'active'
    and deleted_at is null
    and hidden_at is null
  );


-- ---------- source: 265_pulse_board_public_by_default.sql ----------
-- Migration 265 Â· Pulse Board public by default (opt-out via pulse_board_enabled)
--
-- Pulse Board reads/posts ignore profile privacy_mode. Visitors see and post when
-- pulse_board_enabled is true and no block exists between viewer and owner.
--
-- Includes idempotent retention prerequisites from migration 264 when missing.

alter table public.profile_board_shoutouts
  add column if not exists archived_at timestamptz null;

create or replace function public.apply_pulse_board_auto_archive(p_profile_owner_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.profile_board_shoutouts
     set archived_at = now()
   where profile_owner_id = p_profile_owner_id
     and pinned_at is null
     and archived_at is null
     and status = 'active'
     and deleted_at is null
     and hidden_at is null
     and created_at < now() - interval '90 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Visibility helper â€” blocks + board toggle only (not privacy_mode)
-- ---------------------------------------------------------------------------
create or replace function public.viewer_can_view_pulse_board(p_profile_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select auth.uid()) is not distinct from p_profile_owner_id
    or public.viewer_is_staff()
    or (
      not exists (
        select 1
        from public.blocked_users bu
        where (
          bu.blocker_id = (select auth.uid())
          and bu.blocked_id = p_profile_owner_id
        )
        or (
          bu.blocker_id = p_profile_owner_id
          and bu.blocked_id = (select auth.uid())
        )
      )
      and coalesce(
        (
          select pr.pulse_board_enabled
          from public.profiles pr
          where pr.id = p_profile_owner_id
        ),
        true
      )
    );
$$;

comment on function public.viewer_can_view_pulse_board(uuid) is
  'True when viewer may read/post Pulse Board: owner, staff, or non-blocked viewer when pulse_board_enabled (ignores profile privacy_mode).';

-- ---------------------------------------------------------------------------
-- 2. List RPC â€” use board visibility instead of profile surface privacy
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_board_shoutouts(p_profile_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_is_owner boolean := v_viewer is not null and v_viewer = p_profile_owner_id;
  v_is_staff boolean := public.viewer_is_staff();
  v_board_enabled boolean := true;
  v_pinned jsonb;
  v_items jsonb;
  v_limit integer;
begin
  if p_profile_owner_id is null then
    raise exception 'profile required' using errcode = '22000';
  end if;

  if not v_is_owner and not v_is_staff then
    if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;

    select coalesce(pr.pulse_board_enabled, true)
      into v_board_enabled
    from public.profiles pr
    where pr.id = p_profile_owner_id;

    if not v_board_enabled then
      return jsonb_build_object(
        'pinned', null,
        'items', '[]'::jsonb,
        'is_owner_view', false
      );
    end if;
  end if;

  perform public.apply_pulse_board_auto_archive(p_profile_owner_id);

  select to_jsonb(row)
    into v_pinned
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is not null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
    order by s.pinned_at desc
    limit 1
  ) row;

  v_limit := case when v_is_owner or v_is_staff then 100 else 30 end;

  select coalesce(jsonb_agg(to_jsonb(row) order by row.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
      and (
        v_is_owner
        or v_is_staff
        or s.archived_at is null
      )
    order by s.created_at desc
    limit v_limit
  ) row;

  return jsonb_build_object(
    'pinned', v_pinned,
    'items', coalesce(v_items, '[]'::jsonb),
    'is_owner_view', v_is_owner or v_is_staff
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Post RPC â€” board visibility instead of profile surface privacy
-- ---------------------------------------------------------------------------
create or replace function public.post_profile_board_shoutout(
  p_profile_owner_id uuid,
  p_body text
)
returns public.profile_board_shoutouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trimmed text;
  v_row public.profile_board_shoutouts;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'empty shoutout' using errcode = '22000';
  end if;
  if char_length(v_trimmed) > 160 then
    raise exception 'shoutout too long' using errcode = '22000';
  end if;
  if v_trimmed ~* '(https?://|www\.)' then
    raise exception 'links not allowed' using errcode = '22000';
  end if;

  if v_user = p_profile_owner_id then
    raise exception 'self shoutouts not allowed' using errcode = '22000';
  end if;

  if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not coalesce(
    (select pr.pulse_board_enabled from public.profiles pr where pr.id = p_profile_owner_id),
    true
  ) then
    raise exception 'board disabled' using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '30 seconds'
      and s.status = 'active'
  ) then
    raise exception 'rate limited cooldown' using errcode = '22000';
  end if;

  if (
    select count(*)::int
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '1 hour'
      and s.status in ('active', 'hidden', 'reported', 'pending')
  ) >= 12 then
    raise exception 'rate limited hourly cap' using errcode = '22000';
  end if;

  insert into public.profile_board_shoutouts (profile_owner_id, author_id, body)
       values (p_profile_owner_id, v_user, v_trimmed)
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS â€” direct table reads use board visibility (legacy fallback path)
-- ---------------------------------------------------------------------------
drop policy if exists "Pulse board shoutouts readable on visible profiles"
  on public.profile_board_shoutouts;
drop policy if exists "Pulse board shoutouts readable when board enabled"
  on public.profile_board_shoutouts;

create policy "Pulse board shoutouts readable when board enabled"
  on public.profile_board_shoutouts for select
  using (
    status = 'active'
    and deleted_at is null
    and hidden_at is null
    and archived_at is null
    and public.viewer_can_view_pulse_board(profile_owner_id)
  );


-- ---------- source: 266_fix_pulse_board_read_and_posts_viewer_safe.sql ----------
-- Migration 266 Â· Pulse Board read RPC + posts_viewer_safe refresh
--
-- 1. get_profile_board_shoutouts was STABLE but calls apply_pulse_board_auto_archive
--    (UPDATE) â†’ "cannot execute UPDATE in a read-only transaction" on Supabase RPC.
-- 2. posts_viewer_safe missing video_overlay_style (added in 237) â€” refresh view.

-- ---------------------------------------------------------------------------
-- 1. Pulse Board list RPC â€” must be VOLATILE (lazy auto-archive writes)
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_board_shoutouts(p_profile_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_is_owner boolean := v_viewer is not null and v_viewer = p_profile_owner_id;
  v_is_staff boolean := public.viewer_is_staff();
  v_board_enabled boolean := true;
  v_pinned jsonb;
  v_items jsonb;
  v_limit integer;
begin
  if p_profile_owner_id is null then
    raise exception 'profile required' using errcode = '22000';
  end if;

  if not v_is_owner and not v_is_staff then
    if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;

    select coalesce(pr.pulse_board_enabled, true)
      into v_board_enabled
    from public.profiles pr
    where pr.id = p_profile_owner_id;

    if not v_board_enabled then
      return jsonb_build_object(
        'pinned', null,
        'items', '[]'::jsonb,
        'is_owner_view', false
      );
    end if;
  end if;

  perform public.apply_pulse_board_auto_archive(p_profile_owner_id);

  select to_jsonb(row)
    into v_pinned
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is not null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
    order by s.pinned_at desc
    limit 1
  ) row;

  v_limit := case when v_is_owner or v_is_staff then 100 else 30 end;

  select coalesce(jsonb_agg(to_jsonb(row) order by row.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
      and (
        v_is_owner
        or v_is_staff
        or s.archived_at is null
      )
    order by s.created_at desc
    limit v_limit
  ) row;

  return jsonb_build_object(
    'pinned', v_pinned,
    'items', coalesce(v_items, '[]'::jsonb),
    'is_owner_view', v_is_owner or v_is_staff
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. posts_viewer_safe â€” include video_overlay_style (migration 237)
-- ---------------------------------------------------------------------------
drop view if exists public.posts_viewer_safe;

create view public.posts_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  p.id,
  public.viewer_safe_creator_id(p.creator_id, p.is_anonymous) as creator_id,
  p.type,
  p.caption,
  p.created_at,
  p.edited_at,
  p.media_url,
  p.thumbnail_url,
  p.additional_media,
  p.hashtags,
  p.communities,
  p.feed_type_eligible,
  p.role_context,
  p.specialty_context,
  p.location_context,
  p.is_anonymous,
  p.privacy_mode,
  p.like_count,
  p.comment_count,
  p.share_count,
  p.view_count,
  p.save_count,
  p.reaction_heart_count,
  p.reaction_haha_count,
  p.reaction_wow_count,
  p.reaction_sad_count,
  p.reaction_angry_count,
  p.reaction_clap_count,
  p.ranking_score,
  p.sound_title,
  p.sound_source_post_id,
  p.sound_source_media_url,
  p.stitch_source_post_id,
  p.source_live_stream_id,
  p.source_post_id,
  p.source_creator_id,
  p.duet_parent_id,
  p.duet_layout_mode,
  p.video_look_id,
  p.video_overlay_text,
  p.video_overlay_style,
  p.mood_preset,
  p.cover_alt_url,
  p.clip_start_seconds,
  p.clip_end_seconds,
  p.allow_viewer_clips,
  p.allow_remix,
  p.allow_clip_downloads,
  p.comments_disabled,
  p.is_education,
  p.evidence_label,
  p.evidence_url,
  p.education_citations,
  p.shift_context,
  p.scheduled_status,
  p.scheduled_at,
  p.series_id,
  p.series_part,
  p.series_total,
  p.media_processing_status,
  p.media_processing_error,
  p.media_processing_job_id
from public.posts p
where public.viewer_can_read_post_row(p.creator_id, p.privacy_mode);

comment on view public.posts_viewer_safe is
  'SECURITY DEFINER (intentional): masks anonymous creator_id; filters private/hidden rows per viewer.';

grant select on public.posts_viewer_safe to anon, authenticated, service_role;



-- ---------- reconcile: restore owner notify on post_profile_board_shoutout (261 + 265) ----------
create or replace function public.post_profile_board_shoutout(
  p_profile_owner_id uuid,
  p_body text
)
returns public.profile_board_shoutouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trimmed text;
  v_row public.profile_board_shoutouts;
  v_actor_name text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'empty shoutout' using errcode = '22000';
  end if;
  if char_length(v_trimmed) > 160 then
    raise exception 'shoutout too long' using errcode = '22000';
  end if;
  if v_trimmed ~* '(https?://|www\.)' then
    raise exception 'links not allowed' using errcode = '22000';
  end if;

  if v_user = p_profile_owner_id then
    raise exception 'self shoutouts not allowed' using errcode = '22000';
  end if;

  if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not coalesce(
    (select pr.pulse_board_enabled from public.profiles pr where pr.id = p_profile_owner_id),
    true
  ) then
    raise exception 'board disabled' using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '30 seconds'
      and s.status = 'active'
  ) then
    raise exception 'rate limited cooldown' using errcode = '22000';
  end if;

  if (
    select count(*)::int
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '1 hour'
      and s.status in ('active', 'hidden', 'reported', 'pending')
  ) >= 12 then
    raise exception 'rate limited hourly cap' using errcode = '22000';
  end if;

  insert into public.profile_board_shoutouts (profile_owner_id, author_id, body)
       values (p_profile_owner_id, v_user, v_trimmed)
    returning * into v_row;

  begin
    select coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.username), ''),
      'Someone'
    )
      into v_actor_name
    from public.profiles p
    where p.id = v_user;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      p_profile_owner_id,
      v_user,
      'pulse_board_shoutout',
      coalesce(v_actor_name, 'Someone') || ' left a Pulse on your board.',
      'pulse_board:' || p_profile_owner_id::text,
      false
    );
  exception when others then
    perform public.log_trigger_error(
      'post_profile_board_shoutout_notify',
      'INSERT',
      'profile_board_shoutouts',
      sqlstate,
      sqlerrm,
      jsonb_build_object(
        'profile_owner_id', p_profile_owner_id,
        'shoutout_id', v_row.id,
        'author_id', v_user
      )
    );
  end;

  return v_row;
end;
$$;

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;
