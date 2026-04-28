-- ============================================================
-- PulseVerse Database Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  first_name text not null,
  last_name text,
  role text not null default 'RN',
  specialty text not null default 'General',
  city text not null default '',
  state text not null default '',
  years_experience int not null default 0,
  bio text not null default '',
  avatar_url text,
  follower_count int not null default 0,
  following_count int not null default 0,
  like_count int not null default 0,
  post_count int not null default 0,
  privacy_mode text not null default 'public',
  shift_preference text not null default 'No Preference',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, first_name, last_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1)),
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FOLLOWS
-- ============================================================
create table public.follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can manage own follows"
  on public.follows for all using (auth.uid() = follower_id);

-- ============================================================
-- POSTS
-- ============================================================
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'text',
  caption text not null default '',
  media_url text,
  thumbnail_url text,
  hashtags text[] not null default '{}',
  communities text[] not null default '{}',
  is_anonymous boolean not null default false,
  privacy_mode text not null default 'public',
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  view_count int not null default 0,
  save_count int not null default 0,
  ranking_score float not null default 0,
  feed_type_eligible text[] not null default '{forYou}',
  role_context text not null default 'RN',
  specialty_context text not null default 'General',
  location_context text not null default '',
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Users can create own posts"
  on public.posts for insert with check (auth.uid() = creator_id);

create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = creator_id);

create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = creator_id);

-- ============================================================
-- POST LIKES
-- ============================================================
create table public.post_likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

alter table public.post_likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.post_likes for select using (true);

create policy "Users can manage own likes"
  on public.post_likes for all using (auth.uid() = user_id);

-- ============================================================
-- SAVED POSTS
-- ============================================================
create table public.saved_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  saved_at timestamptz not null default now(),
  unique(user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy "Users can view own saved posts"
  on public.saved_posts for select using (auth.uid() = user_id);

create policy "Users can manage own saved posts"
  on public.saved_posts for all using (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  like_count int not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Users can create comments"
  on public.comments for insert with check (auth.uid() = author_id);

create policy "Users can update own comments"
  on public.comments for update using (auth.uid() = author_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = author_id);

-- ============================================================
-- COMMUNITIES
-- ============================================================
create table public.communities (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  icon text not null default '🏥',
  accent_color text not null default '#1E4ED8',
  banner_url text,
  member_count int not null default 0,
  post_count int not null default 0,
  categories text[] not null default '{}',
  trending_topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.communities enable row level security;

create policy "Communities are viewable by everyone"
  on public.communities for select using (true);

-- ============================================================
-- COMMUNITY MEMBERS
-- ============================================================
create table public.community_members (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(community_id, user_id)
);

alter table public.community_members enable row level security;

create policy "Community members are viewable by everyone"
  on public.community_members for select using (true);

create policy "Users can manage own memberships"
  on public.community_members for all using (auth.uid() = user_id);

-- ============================================================
-- JOBS
-- ============================================================
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  employer_name text not null,
  employer_logo text,
  city text not null default '',
  state text not null default '',
  role text not null default 'RN',
  specialty text not null default 'General',
  pay_min int not null default 0,
  pay_max int not null default 0,
  shift text not null default 'Day',
  employment_type text not null default 'Full-Time',
  description text not null default '',
  requirements text[] not null default '{}',
  benefits text[] not null default '{}',
  is_featured boolean not null default false,
  is_new boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "Jobs are viewable by everyone"
  on public.jobs for select using (true);

-- ============================================================
-- SAVED JOBS
-- ============================================================
create table public.saved_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  saved_at timestamptz not null default now(),
  unique(user_id, job_id)
);

alter table public.saved_jobs enable row level security;

create policy "Users can view own saved jobs"
  on public.saved_jobs for select using (auth.uid() = user_id);

create policy "Users can manage own saved jobs"
  on public.saved_jobs for all using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  target_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- ============================================================
-- BADGES
-- ============================================================
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  icon text not null default '⭐',
  color text not null default '#D4A63A',
  category text not null default 'achievement'
);

alter table public.badges enable row level security;

create policy "Badges are viewable by everyone"
  on public.badges for select using (true);

-- ============================================================
-- USER BADGES
-- ============================================================
create table public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  awarded_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "User badges are viewable by everyone"
  on public.user_badges for select using (true);

-- ============================================================
-- USER INTERESTS
-- ============================================================
create table public.user_interests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  interest text not null,
  unique(user_id, interest)
);

alter table public.user_interests enable row level security;

create policy "Interests are viewable by everyone"
  on public.user_interests for select using (true);

create policy "Users can manage own interests"
  on public.user_interests for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_posts_creator on public.posts(creator_id);
create index idx_posts_created on public.posts(created_at desc);
create index idx_posts_feed_type on public.posts using gin(feed_type_eligible);
create index idx_comments_post on public.comments(post_id);
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);
create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_community_members_user on public.community_members(user_id);
create index idx_saved_jobs_user on public.saved_jobs(user_id);
create index idx_saved_posts_user on public.saved_posts(user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true);
insert into storage.buckets (id, name, public) values ('community-banners', 'community-banners', true);
insert into storage.buckets (id, name, public) values ('employer-logos', 'employer-logos', true);

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Post media is publicly accessible"
  on storage.objects for select using (bucket_id = 'post-media');

create policy "Users can upload post media"
  on storage.objects for insert with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Community banners are publicly accessible"
  on storage.objects for select using (bucket_id = 'community-banners');

create policy "Employer logos are publicly accessible"
  on storage.objects for select using (bucket_id = 'employer-logos');
