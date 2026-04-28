-- ============================================================
-- 010: Monetization tables — Sponsored Posts, Subscriptions,
--      Job Pricing, Creator Tips & Earnings
-- ============================================================

-- ─── Ad Campaigns ───────────────────────────────────────────
create table if not exists public.ad_campaigns (
  id uuid default gen_random_uuid() primary key,
  advertiser_name text not null,
  advertiser_logo text,
  title text not null,
  description text not null default '',
  media_url text not null,
  cta_label text not null default 'Learn More',
  cta_url text not null,
  target_roles text[] default '{}',
  target_specialties text[] default '{}',
  target_states text[] default '{}',
  budget_total numeric(10,2) not null default 0,
  budget_spent numeric(10,2) not null default 0,
  cpm_rate numeric(8,2) not null default 15.00,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.increment_ad_impression(campaign_id uuid)
returns void as $$
begin
  update public.ad_campaigns
    set impressions = impressions + 1,
        budget_spent = budget_spent + (cpm_rate / 1000)
    where id = campaign_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_ad_click(campaign_id uuid)
returns void as $$
begin
  update public.ad_campaigns
    set clicks = clicks + 1
    where id = campaign_id;
end;
$$ language plpgsql security definer;

-- ─── User Subscriptions ─────────────────────────────────────
create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro_monthly','pro_yearly')),
  expires_at timestamptz,
  revenuecat_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.user_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

-- ─── Job Postings (paid tiers) ──────────────────────────────
create table if not exists public.job_postings (
  id uuid default gen_random_uuid() primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  employer_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'basic' check (tier in ('basic','standard','premium','featured')),
  paid_amount numeric(10,2) not null default 0,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','paused')),
  created_at timestamptz default now()
);

alter table public.job_postings enable row level security;

create policy "Employers can manage own postings"
  on public.job_postings for all
  using (auth.uid() = employer_id);

-- ─── Creator Tips ───────────────────────────────────────────
create table if not exists public.creator_tips (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_creator_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount in (1,5,10,25,50,100)),
  message text,
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.creator_tips enable row level security;

create policy "Users can send tips"
  on public.creator_tips for insert
  with check (auth.uid() = from_user_id);

create policy "Creators can view received tips"
  on public.creator_tips for select
  using (auth.uid() = to_creator_id or auth.uid() = from_user_id);

-- ─── Creator Earnings ───────────────────────────────────────
create table if not exists public.creator_earnings (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid not null references auth.users(id) on delete cascade unique,
  total_tips numeric(10,2) not null default 0,
  total_views bigint not null default 0,
  total_likes bigint not null default 0,
  monthly_earnings numeric(10,2) not null default 0,
  lifetime_earnings numeric(10,2) not null default 0,
  pending_payout numeric(10,2) not null default 0,
  last_payout_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.creator_earnings enable row level security;

create policy "Creators can view own earnings"
  on public.creator_earnings for select
  using (auth.uid() = creator_id);

create or replace function public.increment_creator_earnings(creator_id uuid, tip_amount numeric)
returns void as $$
begin
  insert into public.creator_earnings (creator_id, total_tips, monthly_earnings, lifetime_earnings, pending_payout)
    values (creator_id, tip_amount, tip_amount * 0.95, tip_amount * 0.95, tip_amount * 0.95)
    on conflict (creator_id) do update set
      total_tips = creator_earnings.total_tips + tip_amount,
      monthly_earnings = creator_earnings.monthly_earnings + (tip_amount * 0.95),
      lifetime_earnings = creator_earnings.lifetime_earnings + (tip_amount * 0.95),
      pending_payout = creator_earnings.pending_payout + (tip_amount * 0.95),
      updated_at = now();
end;
$$ language plpgsql security definer;

-- ─── Payout Requests ────────────────────────────────────────
create table if not exists public.payout_requests (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2),
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  created_at timestamptz default now(),
  processed_at timestamptz
);

alter table public.payout_requests enable row level security;

create policy "Creators can manage own payout requests"
  on public.payout_requests for all
  using (auth.uid() = creator_id);
