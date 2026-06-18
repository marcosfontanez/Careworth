-- Migration 264 · Pulse Board retention & display rules
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
-- Lazy auto-archive (V1 — no hard delete)
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
-- List RPC — pinned + capped unpinned items
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
-- Pin / unpin — respect archive rules
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
-- RLS — public reads exclude archived; owner reads include archived
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
