-- ============================================================
-- 045: RLS for stream_polls / stream_poll_votes / stream_pinned_messages
-- ============================================================
-- Migration 011 created these tables without RLS, leaving them writable by
-- anyone. This migration enables RLS and adds sensible policies so:
--   * anyone can read polls / pins for any stream they can see
--   * only the stream host can create or update polls and pins
--   * authenticated users can cast exactly one vote per poll (enforced by the
--     existing unique (poll_id, user_id) index)
--
-- Note: `stream_id` on these tables is `text` (from migration 011). We compare
-- it to `live_streams.id::text` so the host-ownership predicate works across
-- the type mismatch without needing a schema change.

-- ─── stream_polls ───────────────────────────────────────────
alter table public.stream_polls enable row level security;

drop policy if exists "Anyone can view polls" on public.stream_polls;
create policy "Anyone can view polls"
  on public.stream_polls for select
  using (true);

drop policy if exists "Hosts can create polls" on public.stream_polls;
create policy "Hosts can create polls"
  on public.stream_polls for insert
  with check (
    exists (
      select 1 from public.live_streams ls
      where ls.id::text = stream_id and ls.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts can update polls" on public.stream_polls;
create policy "Hosts can update polls"
  on public.stream_polls for update
  using (
    exists (
      select 1 from public.live_streams ls
      where ls.id::text = stream_id and ls.host_id = auth.uid()
    )
  );

-- ─── stream_poll_votes ──────────────────────────────────────
alter table public.stream_poll_votes enable row level security;

drop policy if exists "Anyone can view votes" on public.stream_poll_votes;
create policy "Anyone can view votes"
  on public.stream_poll_votes for select
  using (true);

drop policy if exists "Users can cast their own vote" on public.stream_poll_votes;
create policy "Users can cast their own vote"
  on public.stream_poll_votes for insert
  with check (auth.uid() = user_id);

-- ─── stream_pinned_messages ─────────────────────────────────
alter table public.stream_pinned_messages enable row level security;

drop policy if exists "Anyone can view active pins" on public.stream_pinned_messages;
create policy "Anyone can view active pins"
  on public.stream_pinned_messages for select
  using (true);

drop policy if exists "Hosts can create pins" on public.stream_pinned_messages;
create policy "Hosts can create pins"
  on public.stream_pinned_messages for insert
  with check (
    auth.uid() = pinned_by
    and exists (
      select 1 from public.live_streams ls
      where ls.id::text = stream_id and ls.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts can unpin" on public.stream_pinned_messages;
create policy "Hosts can unpin"
  on public.stream_pinned_messages for update
  using (
    exists (
      select 1 from public.live_streams ls
      where ls.id::text = stream_id and ls.host_id = auth.uid()
    )
  );
