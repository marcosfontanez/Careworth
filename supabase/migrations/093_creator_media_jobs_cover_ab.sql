-- Heavy media work (ffmpeg, ML exports) runs on an external worker using the service role.
-- Rows here are the contract between the app, Edge Functions, and that worker.

create table if not exists public.creator_media_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'trim',
    'timelapse',
    'stitch',
    'broll',
    'pitch_shift',
    'background_matte',
    'face_blur',
    'silence_detect',
    'cinemagraph_export',
    'parallax_export'
  )),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_media_jobs_idempotency unique (user_id, idempotency_key)
);

-- Allow many rows when idempotency_key is null (Postgres: UNIQUE treats nulls as distinct)
create index if not exists creator_media_jobs_user_status_idx
  on public.creator_media_jobs (user_id, status, created_at desc);

comment on table public.creator_media_jobs is
  'Off-device encoding / ML queue. Worker: poll queued rows, read input json (storage paths, trim ranges), write output + status.';

alter table public.creator_media_jobs enable row level security;

create policy creator_media_jobs_select_own
  on public.creator_media_jobs for select using (auth.uid() = user_id);

create policy creator_media_jobs_insert_own
  on public.creator_media_jobs for insert with check (auth.uid() = user_id);

create policy creator_media_jobs_update_own
  on public.creator_media_jobs for update using (auth.uid() = user_id);

-- Cover A/B: variant must match hash used in app (lib/coverAbPoster.ts).
create table if not exists public.post_cover_ab_events (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  variant text not null check (variant in ('a', 'b')),
  event_type text not null check (event_type in ('impression', 'view_2s', 'play', 'like', 'comment', 'share', 'save')),
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists post_cover_ab_events_post_idx
  on public.post_cover_ab_events (post_id, created_at desc);

create index if not exists post_cover_ab_events_variant_idx
  on public.post_cover_ab_events (post_id, variant, event_type);

alter table public.post_cover_ab_events enable row level security;

create policy post_cover_ab_events_insert
  on public.post_cover_ab_events for insert
  with check (auth.uid() = viewer_id);

create policy post_cover_ab_events_select_creator
  on public.post_cover_ab_events for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.creator_id = auth.uid()
    )
  );
