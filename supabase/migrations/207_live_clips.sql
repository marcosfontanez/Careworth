-- ============================================================================
-- 207: Live clips — draft/ready/published entities + server-side trim jobs.
-- Requires 205 (recordings), 206 (markers). Worker trim in creator-media-worker.
-- ============================================================================

alter table public.posts
  add column if not exists source_live_stream_id uuid references public.live_streams(id) on delete set null;

comment on column public.posts.source_live_stream_id is
  'When set, post video was clipped from this live stream (Clip Studio publish).';

create table if not exists public.live_clips (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  recording_id uuid not null references public.live_recordings(id) on delete restrict,
  marker_id uuid references public.live_clip_markers(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Live clip',
  caption text,
  hashtags text[] not null default '{}',
  category text,
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null check (end_seconds > start_seconds),
  duration_seconds integer,
  storage_path text,
  thumbnail_path text,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'ready', 'failed', 'published')),
  publish_status text not null default 'unpublished'
    check (publish_status in ('unpublished', 'published')),
  processing_job_id uuid references public.creator_media_jobs(id) on delete set null,
  feed_post_id uuid references public.posts(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

comment on table public.live_clips is
  'Trimmed live moments — ffmpeg worker writes MP4 to post-media; host publishes to feed.';

create index if not exists live_clips_stream_created_idx
  on public.live_clips (stream_id, created_at desc);

create index if not exists live_clips_host_status_idx
  on public.live_clips (host_id, status, created_at desc);

alter table public.live_clips enable row level security;

drop policy if exists live_clips_host_all on public.live_clips;
create policy live_clips_host_all
  on public.live_clips
  for all
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

drop policy if exists live_clips_creator_select on public.live_clips;
create policy live_clips_creator_select
  on public.live_clips
  for select
  to authenticated
  using (created_by = (select auth.uid()));

-- Host reviews viewer markers.
create or replace function public.review_live_clip_marker(
  p_marker_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_marker public.live_clip_markers%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision');
  end if;

  select * into v_marker from public.live_clip_markers where id = p_marker_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_marker.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  update public.live_clip_markers
  set status = p_decision
  where id = p_marker_id;

  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;

revoke all on function public.review_live_clip_marker(uuid, text) from public;
grant execute on function public.review_live_clip_marker(uuid, text) to authenticated;

-- Create draft clip from marker + trim window (host only).
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
  if v_marker.created_by <> v_uid and v_marker.status <> 'approved' then
    return jsonb_build_object('ok', false, 'code', 'marker_not_approved');
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
    start_seconds, end_seconds, duration_seconds, status, publish_status
  )
  values (
    p_stream_id,
    v_recording.id,
    p_marker_id,
    v_uid,
    v_stream.host_id,
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

revoke all on function public.create_live_clip_draft(uuid, uuid, text, text, text[], text, integer, integer) from public;
grant execute on function public.create_live_clip_draft(uuid, uuid, text, text, text[], text, integer, integer) to authenticated;

-- Enqueue ffmpeg trim + mark clip processing.
create or replace function public.generate_live_clip(p_clip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clip public.live_clips%rowtype;
  v_recording public.live_recordings%rowtype;
  v_job_id uuid;
  v_output_path text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;

  select * into v_clip from public.live_clips where id = p_clip_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_clip.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_clip.status not in ('draft', 'failed', 'ready') then
    return jsonb_build_object('ok', false, 'code', 'invalid_status');
  end if;

  select * into v_recording from public.live_recordings where id = v_clip.recording_id;
  if not found or v_recording.storage_path is null then
    return jsonb_build_object('ok', false, 'code', 'recording_not_ready');
  end if;

  v_output_path := v_uid::text || '/live-clips/' || p_clip_id::text || '.mp4';

  insert into public.creator_media_jobs (user_id, kind, input, idempotency_key)
  values (
    v_uid,
    'trim',
    jsonb_build_object(
      'bucket', 'live-recordings',
      'storagePathIn', v_recording.storage_path,
      'trimStartSec', v_clip.start_seconds,
      'trimEndSec', v_clip.end_seconds,
      'outputBucket', 'post-media',
      'outputPath', v_output_path,
      'target_live_clip_id', p_clip_id
    ),
    'live-clip:' || p_clip_id::text
  )
  returning id into v_job_id;

  update public.live_clips
  set
    status = 'processing',
    processing_job_id = v_job_id,
    error_message = null,
    storage_path = v_output_path,
    thumbnail_path = v_uid::text || '/live-clips/' || p_clip_id::text || '.jpg'
  where id = p_clip_id;

  return jsonb_build_object('ok', true, 'clip_id', p_clip_id, 'job_id', v_job_id);
end;
$$;

revoke all on function public.generate_live_clip(uuid) from public;
grant execute on function public.generate_live_clip(uuid) to authenticated;

-- Signed download URL for ready/published clips (host or creator).
create or replace function public.get_live_clip_download_url(p_clip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clip public.live_clips%rowtype;
  v_path text;
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

revoke all on function public.get_live_clip_download_url(uuid) from public;
grant execute on function public.get_live_clip_download_url(uuid) to authenticated;

-- Include trim jobs in worker claim queue.
create or replace function public.claim_next_creator_media_job()
returns setof public.creator_media_jobs
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  with picked_patch as (
    select j.id
    from public.creator_media_jobs j
    where j.status = 'awaiting_post_patch'
      and j.encode_complete = true
      and j.output is not null
      and j.kind in ('stitch', 'broll', 'trim')
      and (j.next_retry_at is null or j.next_retry_at <= now())
      and j.attempt_count < j.max_attempts
    order by j.updated_at asc
    for update skip locked
    limit 1
  ),
  picked_queue as (
    select j.id
    from public.creator_media_jobs j
    where j.status = 'queued'
      and j.kind in ('stitch', 'broll', 'trim')
      and (j.next_retry_at is null or j.next_retry_at <= now())
      and j.attempt_count < j.max_attempts
    order by j.created_at asc
    for update skip locked
    limit 1
  ),
  use_row as (
    select id from picked_patch
    union all
    select id from picked_queue
    where not exists (select 1 from picked_patch)
    limit 1
  )
  update public.creator_media_jobs c
  set
    status = 'running',
    updated_at = now(),
    started_at = case
      when c.status = 'awaiting_post_patch' then coalesce(c.started_at, now())
      else now()
    end,
    attempt_count = c.attempt_count + 1,
    next_retry_at = null
  from use_row u
  where c.id = u.id
  returning c.*;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_clips'
  ) then
    alter publication supabase_realtime add table public.live_clips;
  end if;
end $$;
