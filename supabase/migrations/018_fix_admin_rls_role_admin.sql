-- Fix admin RLS from 002_reporting_analytics.sql:
-- Those policies used `profiles.role = 'admin'`, but `role` is the clinical role (RN, CNA, …).
-- The app and 005+ use `role_admin boolean` for staff access.

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins can view all events" on public.analytics_events;
create policy "Admins can view all events"
  on public.analytics_events for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins can manage bans" on public.user_bans;
create policy "Admins can manage bans"
  on public.user_bans for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );
