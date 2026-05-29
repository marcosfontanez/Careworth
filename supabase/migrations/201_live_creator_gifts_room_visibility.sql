-- Live room visibility + realtime for shop creator gifts during broadcasts.
-- Viewers need SELECT on live-context creator_gifts for overlay + leaderboard.

drop policy if exists creator_gifts_live_room_select on public.creator_gifts;
create policy creator_gifts_live_room_select
  on public.creator_gifts for select
  to authenticated
  using (
    context_type = 'live'
    and context_id is not null
    and exists (
      select 1
      from public.live_streams ls
      where ls.id = creator_gifts.context_id
        and ls.status = 'live'
        and ls.ended_at is null
    )
  );

comment on policy creator_gifts_live_room_select on public.creator_gifts is
  'Authenticated viewers on an active live stream can read live-context gift rows (overlay + leaderboard).';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'creator_gifts'
  ) then
    alter publication supabase_realtime add table public.creator_gifts;
  end if;
end $$;
