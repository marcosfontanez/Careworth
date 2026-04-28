-- ============================================================
-- PulseVerse: Feed Ranking Algorithm
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Ranked "For You" feed that scores posts by:
--   1. Engagement velocity (likes + comments + shares relative to age)
--   2. Recency decay (newer posts score higher)
--   3. Role/specialty affinity (posts from same role/specialty get a boost)
--   4. Baseline ranking_score from the posts table
--   5. View count (diminishing returns via log scale)

create or replace function public.get_ranked_feed(
  viewer_id uuid,
  feed_limit int default 50,
  cursor_ts timestamptz default null
)
returns table(
  post_id uuid,
  score float
) as $$
declare
  v_role text;
  v_specialty text;
  v_state text;
begin
  -- Get viewer context for affinity scoring
  select p.role, p.specialty, p.state
  into v_role, v_specialty, v_state
  from public.profiles p
  where p.id = viewer_id;

  return query
  select
    posts.id as post_id,
    (
      -- Base score from manual/computed ranking_score
      coalesce(posts.ranking_score, 0) * 10

      -- Engagement velocity: (likes + comments*2 + shares*3) / age_hours
      + (
        (posts.like_count + posts.comment_count * 2 + posts.share_count * 3)::float
        / greatest(extract(epoch from (now() - posts.created_at)) / 3600, 1)
      ) * 5

      -- Recency: exponential decay, half-life ~12 hours
      + 100 * exp(-0.058 * extract(epoch from (now() - posts.created_at)) / 3600)

      -- View count with diminishing returns (log scale)
      + ln(greatest(posts.view_count, 1) + 1) * 3

      -- Role affinity: boost posts from same role
      + case when posts.role_context = v_role then 15 else 0 end

      -- Specialty affinity: boost posts from same specialty
      + case when posts.specialty_context = v_specialty then 20 else 0 end

      -- Location affinity: boost posts from same state
      + case when posts.location_context = v_state then 10 else 0 end

      -- Boost video content slightly (higher engagement potential)
      + case when posts.type = 'video' then 8 else 0 end

      -- Boost verified creators
      + case when creator.is_verified then 5 else 0 end
    )::float as score

  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  where
    'forYou' = any(posts.feed_type_eligible)
    and posts.privacy_mode = 'public'
    and (cursor_ts is null or posts.created_at < cursor_ts)
  order by score desc
  limit feed_limit;
end;
$$ language plpgsql security definer;


-- "Top Today" feed: highest engagement in last 24 hours
create or replace function public.get_top_today(
  feed_limit int default 50
)
returns table(
  post_id uuid,
  score float
) as $$
begin
  return query
  select
    posts.id as post_id,
    (
      posts.like_count * 1.0
      + posts.comment_count * 2.0
      + posts.share_count * 3.0
      + posts.save_count * 2.5
      + ln(greatest(posts.view_count, 1) + 1) * 2.0
    )::float as score
  from public.posts
  where
    posts.created_at >= now() - interval '24 hours'
    and posts.privacy_mode = 'public'
  order by score desc
  limit feed_limit;
end;
$$ language plpgsql security definer;


-- Update ranking_score periodically (can be called from a cron or edge function)
create or replace function public.update_ranking_scores()
returns void as $$
begin
  update public.posts set
    ranking_score = (
      (like_count + comment_count * 2 + share_count * 3)::float
      / greatest(extract(epoch from (now() - created_at)) / 3600, 1)
    )
  where created_at >= now() - interval '7 days';
end;
$$ language plpgsql security definer;


-- Track post views for algorithm input
create table if not exists public.post_views (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  view_duration_ms int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_post_views_post on public.post_views(post_id);
create index if not exists idx_post_views_viewer on public.post_views(viewer_id);

-- RLS for post_views
alter table public.post_views enable row level security;

create policy "Users can insert their own views"
  on public.post_views for insert
  with check (auth.uid() = viewer_id);

create policy "Users can read their own views"
  on public.post_views for select
  using (auth.uid() = viewer_id);


-- Live streams table for future use
create table if not exists public.live_streams (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null default 'other',
  thumbnail_url text,
  status text not null default 'scheduled' check (status in ('live', 'scheduled', 'ended')),
  viewer_count int default 0,
  peak_viewer_count int default 0,
  started_at timestamptz,
  scheduled_for timestamptz,
  ended_at timestamptz,
  tags text[] default '{}',
  community_id uuid references public.communities(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_streams_status on public.live_streams(status);
create index if not exists idx_streams_host on public.live_streams(host_id);

alter table public.live_streams enable row level security;

create policy "Anyone can view live/scheduled streams"
  on public.live_streams for select
  using (status in ('live', 'scheduled'));

create policy "Hosts can manage their own streams"
  on public.live_streams for all
  using (auth.uid() = host_id);
