-- ============================================================
-- PulseVerse: Reporting, Analytics, Rate Limiting
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- CONTENT REPORTS
-- ============================================================
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null, -- 'post', 'comment', 'profile'
  target_id text not null,
  reason text not null, -- 'spam', 'harassment', 'misinformation', 'inappropriate', 'other'
  details text,
  status text not null default 'pending', -- 'pending', 'reviewed', 'action_taken', 'dismissed'
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on public.reports for select using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on public.reports for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update reports"
  on public.reports for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index idx_reports_status on public.reports(status, created_at desc);
create index idx_reports_target on public.reports(target_type, target_id);

-- ============================================================
-- BLOCKED USERS
-- ============================================================
create table public.blocked_users (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "Users can manage own blocks"
  on public.blocked_users for all using (auth.uid() = blocker_id);

-- ============================================================
-- USER BANS (admin-managed)
-- ============================================================
create table public.user_bans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  banned_by uuid references public.profiles(id) not null,
  reason text not null,
  expires_at timestamptz, -- null = permanent
  created_at timestamptz not null default now()
);

alter table public.user_bans enable row level security;

create policy "Admins can manage bans"
  on public.user_bans for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can see own bans"
  on public.user_bans for select using (auth.uid() = user_id);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  event_data jsonb default '{}',
  screen text,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create policy "Users can insert own events"
  on public.analytics_events for insert with check (auth.uid() = user_id);

create policy "Admins can view all events"
  on public.analytics_events for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index idx_analytics_event on public.analytics_events(event_name, created_at desc);
create index idx_analytics_user on public.analytics_events(user_id, created_at desc);

-- ============================================================
-- RATE LIMIT TRACKING
-- ============================================================
create table public.rate_limits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null, -- 'post', 'comment', 'report', 'message'
  count int not null default 1,
  window_start timestamptz not null default now(),
  unique(user_id, action, window_start)
);

alter table public.rate_limits enable row level security;

create policy "Users can manage own rate limits"
  on public.rate_limits for all using (auth.uid() = user_id);

-- Auto-cleanup old rate limit records (older than 24h)
create or replace function public.cleanup_rate_limits()
returns void as $$
begin
  delete from public.rate_limits where window_start < now() - interval '24 hours';
end;
$$ language plpgsql security definer;

-- ============================================================
-- Add admin role support to profiles
-- ============================================================
alter table public.profiles add column if not exists role_admin boolean not null default false;

-- ============================================================
-- Auto-hide content after N reports
-- ============================================================
create or replace function public.auto_moderate_content()
returns trigger as $$
declare
  report_count int;
begin
  select count(*) into report_count
  from public.reports
  where target_type = new.target_type
    and target_id = new.target_id
    and status = 'pending';

  if report_count >= 5 and new.target_type = 'post' then
    update public.posts
    set privacy_mode = 'private'
    where id = new.target_id::uuid;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_report_created
  after insert on public.reports
  for each row execute function public.auto_moderate_content();
