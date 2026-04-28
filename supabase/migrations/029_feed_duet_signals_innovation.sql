-- Duet parents, evidence metadata, feed personalization, mutual friends RPC, innovation stubs.

alter table public.posts
  add column if not exists duet_parent_id uuid references public.posts(id) on delete set null,
  add column if not exists evidence_url text,
  add column if not exists evidence_label text,
  add column if not exists shift_context text;

comment on column public.posts.duet_parent_id is 'Original clip this video was filmed as a duet beside';
comment on column public.posts.evidence_url is 'Optional citation (protocol, guideline URL)';
comment on column public.posts.shift_context is 'Optional: day | night | weekend for shift-aware surfacing';

create index if not exists idx_posts_duet_parent on public.posts(duet_parent_id);

-- Not interested / hide creator (per viewer)
create table if not exists public.feed_user_actions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('not_interested', 'hide_creator')),
  post_id uuid references public.posts(id) on delete cascade,
  creator_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feed_user_actions_one_target check (
    (action = 'not_interested' and post_id is not null and creator_id is null)
    or (action = 'hide_creator' and creator_id is not null and post_id is null)
  )
);

create unique index if not exists idx_feed_actions_not_interested
  on public.feed_user_actions (user_id, post_id) where action = 'not_interested';

create unique index if not exists idx_feed_actions_hide_creator
  on public.feed_user_actions (user_id, creator_id) where action = 'hide_creator';

create index if not exists idx_feed_actions_user on public.feed_user_actions(user_id, created_at desc);

alter table public.feed_user_actions enable row level security;

drop policy if exists "Users manage own feed actions" on public.feed_user_actions;
create policy "Users manage own feed actions"
  on public.feed_user_actions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mutual follows for Friends tab
create or replace function public.get_mutual_follow_ids(viewer uuid)
returns table (creator_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select f1.following_id
  from public.follows f1
  inner join public.follows f2 on f2.follower_id = f1.following_id and f2.following_id = viewer
  where f1.follower_id = viewer;
$$;

grant execute on function public.get_mutual_follow_ids(uuid) to anon, authenticated;

-- Moderation appeal (user requests review after auto-hide)
create table if not exists public.content_appeals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.content_appeals enable row level security;

drop policy if exists "Users insert own appeals" on public.content_appeals;
create policy "Users insert own appeals"
  on public.content_appeals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own appeals" on public.content_appeals;
create policy "Users read own appeals"
  on public.content_appeals for select
  using (auth.uid() = user_id);

-- Mentor video reactions (stub pipeline)
create table if not exists public.mentor_reactions (
  id uuid primary key default uuid_generate_v4(),
  parent_post_id uuid not null references public.posts(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

alter table public.mentor_reactions enable row level security;

drop policy if exists "Mentor inserts own reaction" on public.mentor_reactions;
create policy "Mentor inserts own reaction"
  on public.mentor_reactions for insert
  with check (auth.uid() = mentor_id);

drop policy if exists "Anyone reads mentor reactions" on public.mentor_reactions;
create policy "Anyone reads mentor reactions"
  on public.mentor_reactions for select using (true);

-- Peer context vote on a sound source (clinical setting signal)
create table if not exists public.sound_context_votes (
  id uuid primary key default uuid_generate_v4(),
  source_post_id uuid not null references public.posts(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 0, 1)),
  created_at timestamptz not null default now(),
  unique (source_post_id, voter_id)
);

alter table public.sound_context_votes enable row level security;

drop policy if exists "sound_context_votes_rw" on public.sound_context_votes;
create policy "sound_context_votes_rw"
  on public.sound_context_votes for all
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);

-- Per-user feed wellness / prefs
create table if not exists public.user_feed_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  shift_feed_filter text,
  reduced_motion boolean not null default false,
  fatigue_break_snooze_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_feed_settings enable row level security;

drop policy if exists "user_feed_settings_own" on public.user_feed_settings;
create policy "user_feed_settings_own"
  on public.user_feed_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
