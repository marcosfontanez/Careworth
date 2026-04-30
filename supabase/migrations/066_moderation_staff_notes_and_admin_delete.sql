-- Staff audit trail on reports + admin ability to delete surfaced content (RLS).
-- Run after 018 (admin RLS uses role_admin).

alter table public.reports add column if not exists staff_notes text;

drop policy if exists "Admins can delete posts for moderation" on public.posts;
create policy "Admins can delete posts for moderation"
  on public.posts for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins can delete comments for moderation" on public.comments;
create policy "Admins can delete comments for moderation"
  on public.comments for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );
