-- ============================================================================
-- 209: Live clip settings — require approval, allow downloads, host-only updates.
-- ============================================================================

alter table public.live_streams
  add column if not exists require_host_approval boolean not null default true;

alter table public.live_streams
  add column if not exists allow_clip_downloads boolean not null default false;

comment on column public.live_streams.require_host_approval is
  'When true, viewer clip markers start as pending until the host approves them.';

comment on column public.live_streams.allow_clip_downloads is
  'When true, non-host users with clip access may download ready clips from this stream.';

-- Host-only clip settings with live vs post-live rules enforced server-side.
create or replace function public.update_live_stream_clip_settings(
  p_stream_id uuid,
  p_viewer_clips_allowed boolean default null,
  p_require_host_approval boolean default null,
  p_allow_clip_downloads boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stream public.live_streams%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;

  if p_stream_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_stream');
  end if;

  if p_viewer_clips_allowed is null
     and p_require_host_approval is null
     and p_allow_clip_downloads is null then
    return jsonb_build_object('ok', false, 'code', 'no_changes');
  end if;

  select * into v_stream
  from public.live_streams
  where id = p_stream_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_stream.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if p_viewer_clips_allowed is not null then
    if v_stream.status <> 'live' or v_stream.ended_at is not null then
      return jsonb_build_object('ok', false, 'code', 'stream_not_live');
    end if;
  end if;

  if p_require_host_approval is not null or p_allow_clip_downloads is not null then
    if v_stream.status not in ('live', 'ended') then
      return jsonb_build_object('ok', false, 'code', 'stream_not_editable');
    end if;
  end if;

  update public.live_streams
  set
    viewer_clips_allowed = coalesce(p_viewer_clips_allowed, viewer_clips_allowed),
    require_host_approval = coalesce(p_require_host_approval, require_host_approval),
    allow_clip_downloads = coalesce(p_allow_clip_downloads, allow_clip_downloads)
  where id = p_stream_id;

  return jsonb_build_object(
    'ok', true,
    'viewer_clips_allowed', coalesce(p_viewer_clips_allowed, v_stream.viewer_clips_allowed),
    'require_host_approval', coalesce(p_require_host_approval, v_stream.require_host_approval),
    'allow_clip_downloads', coalesce(p_allow_clip_downloads, v_stream.allow_clip_downloads)
  );
end;
$$;

revoke all on function public.update_live_stream_clip_settings(uuid, boolean, boolean, boolean) from public;
grant execute on function public.update_live_stream_clip_settings(uuid, boolean, boolean, boolean) to authenticated;

comment on function public.update_live_stream_clip_settings(uuid, boolean, boolean, boolean) is
  'Host updates live clip settings. Viewer clips only while live; approval/download rules editable live or post-live.';

-- Viewer marker status respects require_host_approval (208 window logic preserved).
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
    if coalesce(v_stream.require_host_approval, true) then
      v_status := 'pending';
    else
      v_status := 'submitted';
    end if;
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

-- Host may draft from submitted viewer markers when approval is waived; pending still blocked.
create or replace function public.create_live_clip_draft(
  p_stream_id uuid,
  p_marker_id uuid,
  p_title text,
  p_caption text,
  p_hashtags text[],
  p_category text,
  p_start_seconds integer,
  p_end_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stream public.live_streams%rowtype;
  v_marker public.live_clip_markers%rowtype;
  v_recording public.live_recordings%rowtype;
  v_clip_id uuid;
  v_dur integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;

  select * into v_stream from public.live_streams where id = p_stream_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_stream.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select * into v_marker
  from public.live_clip_markers
  where id = p_marker_id and stream_id = p_stream_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'marker_not_found');
  end if;
  if v_marker.status = 'rejected' then
    return jsonb_build_object('ok', false, 'code', 'marker_rejected');
  end if;
  if v_marker.created_by <> v_uid then
    if v_marker.status = 'pending' then
      return jsonb_build_object('ok', false, 'code', 'marker_not_approved');
    end if;
    if v_marker.status not in ('submitted', 'approved') then
      return jsonb_build_object('ok', false, 'code', 'marker_not_approved');
    end if;
  end if;

  if p_end_seconds <= p_start_seconds then
    return jsonb_build_object('ok', false, 'code', 'invalid_window');
  end if;
  v_dur := p_end_seconds - p_start_seconds;
  if v_dur > 120 then
    return jsonb_build_object('ok', false, 'code', 'duration_too_long');
  end if;

  select * into v_recording
  from public.live_recordings
  where id = v_marker.recording_id;

  if not found then
    select * into v_recording
    from public.live_recordings
    where stream_id = p_stream_id
    order by created_at desc
    limit 1;
  end if;

  if not found or v_recording.storage_path is null then
    return jsonb_build_object('ok', false, 'code', 'recording_not_found');
  end if;

  insert into public.live_clips (
    stream_id, recording_id, marker_id, created_by, host_id,
    title, caption, hashtags, category,
    start_seconds, end_seconds, duration_seconds,
    status, publish_status
  )
  values (
    p_stream_id, v_recording.id, p_marker_id, v_uid, v_stream.host_id,
    coalesce(nullif(trim(p_title), ''), 'Live clip'),
    nullif(trim(p_caption), ''),
    coalesce(p_hashtags, '{}'),
    nullif(trim(p_category), ''),
    p_start_seconds,
    p_end_seconds,
    v_dur,
    'draft',
    'unpublished'
  )
  returning id into v_clip_id;

  return jsonb_build_object('ok', true, 'clip_id', v_clip_id, 'duration_seconds', v_dur);
end;
$$;

-- Non-host downloads require stream.allow_clip_downloads; host always allowed.
create or replace function public.get_live_clip_download_url(p_clip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clip public.live_clips%rowtype;
  v_allow_downloads boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;

  select * into v_clip from public.live_clips where id = p_clip_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_clip.host_id <> v_uid and v_clip.created_by <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_clip.host_id <> v_uid then
    select coalesce(ls.allow_clip_downloads, false)
    into v_allow_downloads
    from public.live_streams ls
    where ls.id = v_clip.stream_id;

    if not coalesce(v_allow_downloads, false) then
      return jsonb_build_object('ok', false, 'code', 'downloads_disabled');
    end if;
  end if;

  if v_clip.status not in ('ready', 'published') or v_clip.storage_path is null then
    return jsonb_build_object('ok', false, 'code', 'not_ready');
  end if;

  return jsonb_build_object(
    'ok', true,
    'storage_path', v_clip.storage_path,
    'bucket', 'post-media',
    'expires_in', 3600
  );
end;
$$;
