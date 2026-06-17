-- Migration 265 · Pulse Board public by default (opt-out via pulse_board_enabled)
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
-- 1. Visibility helper — blocks + board toggle only (not privacy_mode)
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
-- 2. List RPC — use board visibility instead of profile surface privacy
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
-- 3. Post RPC — board visibility instead of profile surface privacy
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
-- 4. RLS — direct table reads use board visibility (legacy fallback path)
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
