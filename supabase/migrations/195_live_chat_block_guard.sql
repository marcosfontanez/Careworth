-- Closed beta: block relationships prevent live chat harassment workarounds.
drop policy if exists "Authenticated users post to live streams" on public.stream_messages;

create policy "Authenticated users post to live streams"
  on public.stream_messages for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.live_streams ls
      where ls.id = stream_id and ls.status = 'live'
    )
    and not exists (
      select 1
      from public.live_streams ls
      inner join public.blocked_users bu on (
        (bu.blocker_id = ls.host_id and bu.blocked_id = (select auth.uid()))
        or (bu.blocker_id = (select auth.uid()) and bu.blocked_id = ls.host_id)
      )
      where ls.id = stream_id
    )
  );
