-- Live public launch: RSVP go-live fanout + accurate viewer attendance (leave + TTL).

-- ─── Purge viewers who stopped heartbeating ─────────────────────────────────
create or replace function public.live_purge_stale_stream_attendance(
  p_stream_id uuid,
  p_ttl interval default interval '90 seconds'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stream_id is null then
    return;
  end if;

  delete from public.live_stream_attendance
  where stream_id = p_stream_id
    and last_seen_at < now() - p_ttl;
end;
$$;

comment on function public.live_purge_stale_stream_attendance(uuid, interval) is
  'Removes attendance rows older than TTL before viewer_count sync (default 90s — 2× 45s heartbeat).';

-- ─── Shared viewer_count sync ───────────────────────────────────────────────
create or replace function public.live_sync_stream_viewer_count(p_stream_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  if p_stream_id is null then
    return 0;
  end if;

  perform public.live_purge_stale_stream_attendance(p_stream_id);

  select count(*)::int into cnt
  from public.live_stream_attendance
  where stream_id = p_stream_id;

  update public.live_streams
  set viewer_count = cnt,
      peak_viewer_count = greatest(coalesce(peak_viewer_count, 0), cnt)
  where id = p_stream_id;

  return cnt;
end;
$$;

comment on function public.live_sync_stream_viewer_count(uuid) is
  'Purge stale attendance, recount unique viewers, update live_streams.viewer_count / peak_viewer_count.';

-- ─── Go-live fanout to RSVP reminders ───────────────────────────────────────
create or replace function public.live_fanout_go_live_notifications(p_stream_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
  v_title text;
  v_host_name text;
  v_message text;
  v_count int := 0;
begin
  if p_stream_id is null then
    return 0;
  end if;

  select ls.host_id, ls.title
  into v_host, v_title
  from public.live_streams ls
  where ls.id = p_stream_id
    and ls.status = 'live'
    and ls.broadcast_started_at is not null
    and ls.ended_at is null;

  if not found then
    return 0;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Someone')
  into v_host_name
  from public.profiles p
  where p.id = v_host;

  v_message :=
    coalesce(v_host_name, 'Someone')
    || ' is live: '
    || coalesce(nullif(trim(v_title), ''), 'PulseVerse Live');

  insert into public.notifications (user_id, actor_id, type, message, target_id, read)
  select
    r.user_id,
    v_host,
    'live_go_live',
    v_message,
    p_stream_id::text,
    false
  from public.live_stream_reminders r
  where r.stream_id = p_stream_id
    and r.user_id is distinct from v_host
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = r.user_id
        and n.type = 'live_go_live'
        and n.target_id = p_stream_id::text
        and n.created_at > now() - interval '6 hours'
    );

  get diagnostics v_count = row_count;
  return v_count;
exception when others then
  perform public.log_trigger_error(
    'live_fanout_go_live_notifications', 'EXECUTE', 'live_streams', sqlstate, sqlerrm,
    jsonb_build_object('stream_id', p_stream_id)
  );
  return 0;
end;
$$;

comment on function public.live_fanout_go_live_notifications(uuid) is
  'Inserts live_go_live in-app notifications for RSVP reminders when host starts broadcasting.';

revoke all on function public.live_fanout_go_live_notifications(uuid) from public;
grant execute on function public.live_fanout_go_live_notifications(uuid) to authenticated;
grant execute on function public.live_fanout_go_live_notifications(uuid) to service_role;

-- ─── Host broadcast stamp + first-time fanout ───────────────────────────────
create or replace function public.live_mark_broadcast_started(p_stream_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated int;
  was_broadcasting boolean;
begin
  if uid is null or p_stream_id is null then
    return false;
  end if;

  select (ls.broadcast_started_at is not null)
  into was_broadcasting
  from public.live_streams ls
  where ls.id = p_stream_id
    and ls.host_id = uid;

  update public.live_streams
  set
    broadcast_started_at = coalesce(broadcast_started_at, now()),
    host_last_seen_at = now()
  where id = p_stream_id
    and host_id = uid
    and status = 'live'
    and ended_at is null;

  get diagnostics updated = row_count;

  if updated > 0 and not coalesce(was_broadcasting, false) then
    perform public.live_fanout_go_live_notifications(p_stream_id);
  end if;

  return updated > 0;
end;
$$;

comment on function public.live_mark_broadcast_started(uuid) is
  'Host-only: stamp broadcast_started_at (once), heartbeat, fan out live_go_live to RSVP reminders.';

-- ─── Viewer heartbeat with TTL purge ───────────────────────────────────────
create or replace function public.live_touch_stream_attendance(p_stream_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  host_id uuid;
begin
  if uid is null then
    return 0;
  end if;

  select ls.host_id into host_id from public.live_streams ls where ls.id = p_stream_id;
  if host_id is null then
    return 0;
  end if;

  if not exists (
    select 1
    from public.live_streams ls
    where ls.id = p_stream_id
      and ls.status = 'live'
      and ls.broadcast_started_at is not null
  ) then
    return coalesce(
      (select ls.viewer_count from public.live_streams ls where ls.id = p_stream_id),
      0
    );
  end if;

  if uid <> host_id then
    insert into public.live_stream_attendance (stream_id, user_id, last_seen_at)
    values (p_stream_id, uid, now())
    on conflict (stream_id, user_id) do update
      set last_seen_at = excluded.last_seen_at;
  end if;

  return public.live_sync_stream_viewer_count(p_stream_id);
end;
$$;

comment on function public.live_touch_stream_attendance(uuid) is
  'Viewer heartbeat: upsert attendance, purge stale rows (90s TTL), sync viewer_count.';

-- ─── Viewer leave ───────────────────────────────────────────────────────────
create or replace function public.live_leave_stream_attendance(p_stream_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_stream_id is null then
    return 0;
  end if;

  delete from public.live_stream_attendance
  where stream_id = p_stream_id
    and user_id = uid;

  return public.live_sync_stream_viewer_count(p_stream_id);
end;
$$;

comment on function public.live_leave_stream_attendance(uuid) is
  'Viewer leave: remove attendance row and sync viewer_count (call on room unmount).';

grant execute on function public.live_leave_stream_attendance(uuid) to authenticated;

-- ─── End stream clears attendance ───────────────────────────────────────────
create or replace function public.end_live_stream(p_stream_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_host uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select ls.status, ls.host_id
  into v_status, v_host
  from public.live_streams ls
  where ls.id = p_stream_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_host <> uid then
    return jsonb_build_object('ok', false, 'reason', 'not_host');
  end if;

  if v_status = 'ended' then
    return jsonb_build_object('ok', true, 'reason', 'already_ended');
  end if;

  update public.live_streams
  set status = 'ended',
      ended_at = now(),
      host_last_seen_at = now(),
      viewer_count = 0
  where id = p_stream_id;

  delete from public.live_stream_attendance
  where stream_id = p_stream_id;

  update public.stream_polls
  set is_active = false
  where stream_id = p_stream_id::text
    and is_active = true;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.end_live_stream(uuid) is
  'Host-only atomic end: status ended, zero viewers, clear attendance, deactivate polls.';
