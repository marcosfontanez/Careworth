-- Live join hardening: atomic broadcast flag + viewer join guard for stale rows.

create or replace function public.live_mark_broadcast_started(p_stream_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null or p_stream_id is null then
    return false;
  end if;

  update public.live_streams
  set
    broadcast_started_at = coalesce(broadcast_started_at, now()),
    host_last_seen_at = now()
  where id = p_stream_id
    and host_id = uid
    and status = 'live'
    and ended_at is null;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

comment on function public.live_mark_broadcast_started(uuid) is
  'Host-only: stamp broadcast_started_at (once) and heartbeat when publishing to LiveKit.';

grant execute on function public.live_mark_broadcast_started(uuid) to authenticated;

-- Viewer join preflight — used by edge token mint (service role) and optional client checks.
create or replace function public.live_stream_viewer_joinable(p_stream_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.live_streams%rowtype;
  stale_after interval := interval '45 minutes';
begin
  select * into row
  from public.live_streams ls
  where ls.id = p_stream_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if row.status = 'ended' or row.ended_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'ended');
  end if;

  if row.status <> 'live' then
    return jsonb_build_object('ok', false, 'reason', 'not_live');
  end if;

  if row.broadcast_started_at is null then
    return jsonb_build_object('ok', false, 'reason', 'not_broadcasting');
  end if;

  if row.livekit_room_name is null or length(trim(row.livekit_room_name)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_room');
  end if;

  if coalesce(row.host_last_seen_at, row.broadcast_started_at, row.started_at) < now() - stale_after then
    return jsonb_build_object('ok', false, 'reason', 'host_stale');
  end if;

  return jsonb_build_object(
    'ok', true,
    'room_name', row.livekit_room_name,
    'broadcast_started_at', row.broadcast_started_at,
    'host_last_seen_at', row.host_last_seen_at
  );
end;
$$;

comment on function public.live_stream_viewer_joinable(uuid) is
  'Preflight for viewer LiveKit tokens — rejects ended, stale, or not-yet-broadcast streams.';

revoke all on function public.live_stream_viewer_joinable(uuid) from public;
grant execute on function public.live_stream_viewer_joinable(uuid) to service_role;
grant execute on function public.live_stream_viewer_joinable(uuid) to authenticated;
