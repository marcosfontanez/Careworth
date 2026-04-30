-- Allow platform admins to end or correct any live stream row (ops console).
drop policy if exists "Admins can update live streams" on public.live_streams;
create policy "Admins can update live streams"
  on public.live_streams for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );
