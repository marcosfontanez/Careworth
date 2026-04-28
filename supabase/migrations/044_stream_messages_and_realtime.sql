-- ============================================================
-- 044: Stream messages (live chat) + realtime publication
-- ============================================================
-- Adds the missing persistence layer for live chat messages so the Live
-- viewer room can read/write real chat instead of simulating it locally.
-- Messages are short-lived (300 char cap, matches comment cap), tied to a
-- `live_streams` row, and published on supabase_realtime for low-latency
-- subscriptions.
--
-- This migration also promotes `stream_gifts` and `stream_polls` onto the
-- realtime publication so gift events and poll updates surface in-room live.

-- ─── stream_messages ────────────────────────────────────────
create table if not exists public.stream_messages (
  id uuid default gen_random_uuid() primary key,

  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id   uuid not null references auth.users(id)           on delete cascade,

  -- Denormalized identity — keeps the chat render path free of extra joins.
  display_name text not null,
  avatar_url   text,
  role         text,

  content text not null
    check (char_length(content) >= 1 and char_length(content) <= 300),

  message_type text not null default 'chat'
    check (message_type in ('chat', 'system', 'gift', 'pinned')),

  is_host       boolean not null default false,
  is_moderator  boolean not null default false,
  is_subscriber boolean not null default false,

  -- Soft-delete so moderation / author-delete leaves a tombstone instead of
  -- tearing a hole in the timeline.
  deleted_at timestamptz,

  created_at timestamptz default now()
);

create index if not exists idx_stream_messages_stream_created
  on public.stream_messages (stream_id, created_at desc);

create index if not exists idx_stream_messages_user
  on public.stream_messages (user_id);

alter table public.stream_messages enable row level security;

-- Read: anyone can read non-deleted messages for any stream they can see.
-- `live_streams` RLS already gates which streams are visible.
drop policy if exists "Anyone can read stream messages" on public.stream_messages;
create policy "Anyone can read stream messages"
  on public.stream_messages for select
  using (deleted_at is null);

-- Insert: an authenticated user can post to a stream that is currently live.
drop policy if exists "Authenticated users post to live streams" on public.stream_messages;
create policy "Authenticated users post to live streams"
  on public.stream_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_streams ls
      where ls.id = stream_id and ls.status = 'live'
    )
  );

-- Update (soft-delete / edits): author or stream host.
drop policy if exists "Authors and hosts can update messages" on public.stream_messages;
create policy "Authors and hosts can update messages"
  on public.stream_messages for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.live_streams ls
      where ls.id = stream_id and ls.host_id = auth.uid()
    )
  );

-- ─── Realtime publication ───────────────────────────────────
-- Add stream_messages + related live tables to the realtime publication so
-- clients can subscribe to INSERT/UPDATE events. The guard blocks re-adds on
-- repeat migrations (Supabase doesn't support `if not exists` on publications).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stream_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.stream_messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stream_gifts'
  ) then
    execute 'alter publication supabase_realtime add table public.stream_gifts';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stream_polls'
  ) then
    execute 'alter publication supabase_realtime add table public.stream_polls';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stream_pinned_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.stream_pinned_messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_streams'
  ) then
    execute 'alter publication supabase_realtime add table public.live_streams';
  end if;
end$$;
