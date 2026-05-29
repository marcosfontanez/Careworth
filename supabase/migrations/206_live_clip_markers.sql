-- ============================================================================
-- 206: Live clip markers — timestamp moments during an active egress recording.
-- ============================================================================

alter table public.live_streams
  add column if not exists viewer_clips_allowed boolean not null default false;

comment on column public.live_streams.viewer_clips_allowed is
  'When true, authenticated viewers may submit clip markers during an active recording.';

create table if not exists public.live_clip_markers (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  recording_id uuid references public.live_recordings(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  marker_time_seconds integer not null check (marker_time_seconds >= 0),
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null check (end_seconds >= start_seconds),
  title text not null default 'Live moment',
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.live_clip_markers is
  'Timestamp markers for future live clip extraction (30s before, 10s after tap).';

create index if not exists live_clip_markers_stream_created_idx
  on public.live_clip_markers (stream_id, created_at desc);

create index if not exists live_clip_markers_host_stream_idx
  on public.live_clip_markers (host_id, stream_id, created_at desc);

alter table public.live_clip_markers enable row level security;

-- Host reads all markers on their stream; users read their own submissions.
drop policy if exists live_clip_markers_select on public.live_clip_markers;
create policy live_clip_markers_select
  on public.live_clip_markers
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or host_id = (select auth.uid())
  );

-- Inserts only while stream is live — enforced in RPC; policy blocks direct client inserts.
drop policy if exists live_clip_markers_insert on public.live_clip_markers;
create policy live_clip_markers_insert
  on public.live_clip_markers
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.live_streams ls
      where ls.id = live_clip_markers.stream_id
        and ls.status = 'live'
        and ls.ended_at is null
        and ls.broadcast_started_at is not null
    )
    and exists (
      select 1
      from public.live_recordings lr
      where lr.stream_id = live_clip_markers.stream_id
        and lr.status = 'recording'
    )
    and (
      live_clip_markers.host_id = (select auth.uid())
      or (
        coalesce((
          select ls.viewer_clips_allowed
          from public.live_streams ls
          where ls.id = live_clip_markers.stream_id
        ), false)
        and live_clip_markers.host_id <> (select auth.uid())
      )
    )
  );

-- Host may update marker status during an active stream (moderation — future clip pipeline).
drop policy if exists live_clip_markers_host_update on public.live_clip_markers;
create policy live_clip_markers_host_update
  on public.live_clip_markers
  for update
  to authenticated
  using (
    host_id = (select auth.uid())
    and exists (
      select 1
      from public.live_streams ls
      where ls.id = live_clip_markers.stream_id
        and ls.status = 'live'
        and ls.ended_at is null
    )
  )
  with check (host_id = (select auth.uid()));

-- Atomic marker creation with recording + permission checks.
create or replace function public.create_live_clip_marker(p_stream_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stream public.live_streams%rowtype;
  v_recording public.live_recordings%rowtype;
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
  v_start_sec := greatest(0, v_marker_sec - 30);
  v_end_sec := v_marker_sec + 10;

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
    'title', 'Live moment'
  );
end;
$$;

revoke all on function public.create_live_clip_marker(uuid) from public;
grant execute on function public.create_live_clip_marker(uuid) to authenticated;

comment on function public.create_live_clip_marker(uuid) is
  'Creates a clip marker on an active live recording. Host → submitted; viewer → pending.';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_clip_markers'
  ) then
    alter publication supabase_realtime add table public.live_clip_markers;
  end if;
end $$;
