-- ============================================================================
-- 205: LiveKit egress recording metadata + private storage bucket
-- Server-side start/stop via Edge Function `livekit-egress` (service role writes).
-- ============================================================================

create table if not exists public.live_recordings (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null,
  egress_id text,
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'recording', 'completed', 'failed', 'stopped')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.live_recordings is
  'LiveKit room-composite egress jobs for live streams (MP4 in live-recordings bucket).';

create index if not exists live_recordings_stream_id_idx
  on public.live_recordings (stream_id);

create index if not exists live_recordings_host_id_idx
  on public.live_recordings (host_id);

create unique index if not exists live_recordings_one_active_per_stream
  on public.live_recordings (stream_id)
  where status in ('pending', 'recording');

alter table public.live_recordings enable row level security;

drop policy if exists live_recordings_host_select on public.live_recordings;
create policy live_recordings_host_select
  on public.live_recordings
  for select
  to authenticated
  using (host_id = auth.uid());

comment on policy live_recordings_host_select on public.live_recordings is
  'Hosts can read recording metadata for their own streams. Writes are service-role only (Edge).';

-- Private bucket — LiveKit egress uploads via S3-compatible credentials (not RLS).
insert into storage.buckets (id, name, public)
values ('live-recordings', 'live-recordings', false)
on conflict (id) do nothing;

-- Hosts may read objects tied to their recordings (signed URLs / future clip UI).
drop policy if exists live_recordings_host_storage_select on storage.objects;
create policy live_recordings_host_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'live-recordings'
    and exists (
      select 1
      from public.live_recordings lr
      where lr.host_id = auth.uid()
        and lr.storage_path = name
    )
  );
