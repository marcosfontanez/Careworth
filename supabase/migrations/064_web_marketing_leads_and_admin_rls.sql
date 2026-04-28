-- Marketing site forms (inserted from Next.js via service role) + admin RLS for web console

-- Contact form submissions (no policies: only service role writes/reads)
create table if not exists public.marketing_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now(),
  host text
);

alter table public.marketing_contact_messages enable row level security;

-- Newsletter signups from marketing footer
create table if not exists public.marketing_newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  constraint marketing_newsletter_signups_email_key unique (email)
);

alter table public.marketing_newsletter_signups enable row level security;

-- Appeals queue for staff
drop policy if exists "Admins can read all content appeals" on public.content_appeals;
create policy "Admins can read all content appeals"
  on public.content_appeals for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins can update content appeals" on public.content_appeals;
create policy "Admins can update content appeals"
  on public.content_appeals for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- Live ops: public policy only exposes live/scheduled — admins need ended streams too
drop policy if exists "Admins can read all live streams" on public.live_streams;
create policy "Admins can read all live streams"
  on public.live_streams for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );
