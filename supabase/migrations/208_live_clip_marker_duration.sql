-- ============================================================================
-- 208: Clip marker duration presets — wire 15s / 30s / 60s lookback to RPC.
-- ============================================================================

alter table public.live_clip_markers
  add column if not exists clip_duration_seconds integer
    check (clip_duration_seconds is null or clip_duration_seconds in (15, 30, 60));

comment on column public.live_clip_markers.clip_duration_seconds is
  'Selected lookback preset (seconds before tap). Host defaults to 30 when omitted.';

comment on table public.live_clip_markers is
  'Timestamp markers for live clip extraction — lookback window ending at tap time.';

create or replace function public.create_live_clip_marker(
  p_stream_id uuid,
  p_duration_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stream public.live_streams%rowtype;
  v_recording public.live_recordings%rowtype;
  v_duration integer;
  v_marker_sec integer;
  v_start_sec integer;
  v_end_sec integer;
  v_status text;
  v_id uuid;
  v_anchor timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;

  if p_stream_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_stream');
  end if;

  v_duration := coalesce(p_duration_seconds, 30);
  if v_duration not in (15, 30, 60) then
    return jsonb_build_object('ok', false, 'code', 'invalid_duration');
  end if;

  select * into v_stream
  from public.live_streams
  where id = p_stream_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_stream.status <> 'live'
     or v_stream.ended_at is not null
     or v_stream.broadcast_started_at is null then
    return jsonb_build_object('ok', false, 'code', 'stream_not_live');
  end if;

  select * into v_recording
  from public.live_recordings
  where stream_id = p_stream_id
    and status = 'recording'
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'recording_not_active');
  end if;

  v_anchor := coalesce(v_recording.started_at, v_stream.broadcast_started_at);
  v_marker_sec := greatest(0, floor(extract(epoch from (now() - v_anchor)))::integer);
  v_start_sec := greatest(0, v_marker_sec - v_duration);
  v_end_sec := v_marker_sec;

  if v_stream.host_id = v_uid then
    v_status := 'submitted';
  else
    if not coalesce(v_stream.viewer_clips_allowed, false) then
      return jsonb_build_object('ok', false, 'code', 'viewer_clips_disabled');
    end if;
    v_status := 'pending';
  end if;

  insert into public.live_clip_markers (
    stream_id,
    recording_id,
    created_by,
    host_id,
    marker_time_seconds,
    start_seconds,
    end_seconds,
    clip_duration_seconds,
    title,
    status
  )
  values (
    p_stream_id,
    v_recording.id,
    v_uid,
    v_stream.host_id,
    v_marker_sec,
    v_start_sec,
    v_end_sec,
    v_duration,
    'Live moment',
    v_status
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'recording_id', v_recording.id,
    'status', v_status,
    'marker_time_seconds', v_marker_sec,
    'start_seconds', v_start_sec,
    'end_seconds', v_end_sec,
    'clip_duration_seconds', v_duration,
    'title', 'Live moment'
  );
end;
$$;

revoke all on function public.create_live_clip_marker(uuid, integer) from public;
grant execute on function public.create_live_clip_marker(uuid, integer) to authenticated;

comment on function public.create_live_clip_marker(uuid, integer) is
  'Creates a clip marker on an active live recording. Window = last N seconds ending at tap (15/30/60).';

-- Drop legacy single-arg overload so clients cannot accidentally hit the old fixed window.
drop function if exists public.create_live_clip_marker(uuid);
