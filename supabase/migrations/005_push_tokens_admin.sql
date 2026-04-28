-- ============================================================
-- PulseVerse: Push Tokens + Admin Analytics
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Push notification token storage
alter table public.profiles add column if not exists push_token text;
alter table public.profiles add column if not exists push_token_updated_at timestamptz;

create index if not exists idx_profiles_push_token on public.profiles(push_token) where push_token is not null;

-- Admin function: get top analytics events from last N days
create or replace function public.get_top_events(days_back int default 7)
returns table(name text, count bigint) as $$
begin
  return query
    select event_name as name, count(*)::bigint as count
    from public.analytics_events
    where created_at >= now() - (days_back || ' days')::interval
    group by event_name
    order by count desc
    limit 20;
end;
$$ language plpgsql security definer;

-- Admin function: daily active users for last N days
create or replace function public.get_daily_active_users(days_back int default 30)
returns table(day date, active_users bigint) as $$
begin
  return query
    select date_trunc('day', created_at)::date as day, count(distinct user_id)::bigint as active_users
    from public.analytics_events
    where created_at >= now() - (days_back || ' days')::interval
      and event_name = 'app_open'
    group by day
    order by day;
end;
$$ language plpgsql security definer;

-- Additional media URLs for multi-image posts
alter table public.posts add column if not exists additional_media text[] default '{}';
