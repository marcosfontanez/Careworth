-- ============================================================
-- PulseVerse: Job Applications
-- ============================================================

create table public.job_applications (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  phone text,
  cover_letter text,
  status text not null default 'submitted', -- 'submitted', 'reviewed', 'interview', 'rejected', 'hired'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;

create policy "Users can view own applications"
  on public.job_applications for select using (auth.uid() = user_id);

create policy "Users can create applications"
  on public.job_applications for insert with check (auth.uid() = user_id);

create policy "Admins can view all applications"
  on public.job_applications for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role_admin = true)
  );

create index idx_applications_user on public.job_applications(user_id, created_at desc);
create index idx_applications_job on public.job_applications(job_id, created_at desc);

-- Prevent duplicate applications
create unique index idx_applications_unique on public.job_applications(job_id, user_id);

-- Comment likes table for Phase 9 comments
create table if not exists public.comment_likes (
  id uuid primary key default uuid_generate_v4(),
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create policy "Comment likes are viewable by everyone"
  on public.comment_likes for select using (true);

create policy "Users can manage own comment likes"
  on public.comment_likes for all using (auth.uid() = user_id);
