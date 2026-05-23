-- Host heartbeat for stale live discovery + atomic host end-stream RPC.

alter table public.live_streams
  add column if not exists host_last_seen_at timestamptz;

comment on column public.live_streams.host_last_seen_at is
  'Host liveness ping while broadcasting; discovery excludes stale rows after crash/disconnect.';

-- Backfill active rows so existing lives stay discoverable until first heartbeat.
update public.live_streams
set host_last_seen_at = coalesce(host_last_seen_at, broadcast_started_at, started_at, created_at)
where status = 'live'
  and ended_at is null
  and broadcast_started_at is not null;

-- Host-only heartbeat (RLS on live_streams UPDATE applies via security invoker).
create or replace function public.live_host_touch_heartbeat(p_stream_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null then
    return false;
  end if;

  update public.live_streams
  set host_last_seen_at = now()
  where id = p_stream_id
    and host_id = uid
    and status = 'live'
    and ended_at is null
    and broadcast_started_at is not null;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

comment on function public.live_host_touch_heartbeat(uuid) is
  'Host liveness ping while broadcasting; used for Happening Now stale-stream exclusion.';

grant execute on function public.live_host_touch_heartbeat(uuid) to authenticated;

-- Atomic end: flip status, stamp ended_at, zero viewers, deactivate polls.
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

  update public.stream_polls
  set is_active = false
  where stream_id = p_stream_id::text
    and is_active = true;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.end_live_stream(uuid) is
  'Host ends a live stream: status ended, ended_at set, viewer_count cleared, active polls deactivated.';

revoke all on function public.end_live_stream(uuid) from public;
grant execute on function public.end_live_stream(uuid) to authenticated;
