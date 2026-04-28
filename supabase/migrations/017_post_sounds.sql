-- TikTok-style sound attribution + saved sounds for reuse

alter table public.posts
  add column if not exists sound_title text,
  add column if not exists sound_source_post_id uuid references public.posts(id) on delete set null;

create index if not exists idx_posts_sound_source on public.posts(sound_source_post_id);

comment on column public.posts.sound_title is 'Display label for feed (e.g. Original sound)';
comment on column public.posts.sound_source_post_id is 'When set, this clip uses audio attributed to another post';

create table if not exists public.saved_sounds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, source_post_id)
);

create index if not exists idx_saved_sounds_user on public.saved_sounds(user_id, created_at desc);

alter table public.saved_sounds enable row level security;

-- Safe to re-run in SQL Editor (policies already exist from a partial run).
drop policy if exists "Users can view own saved sounds" on public.saved_sounds;
drop policy if exists "Users can save sounds" on public.saved_sounds;
drop policy if exists "Users can remove saved sounds" on public.saved_sounds;

create policy "Users can view own saved sounds"
  on public.saved_sounds for select using (auth.uid() = user_id);

create policy "Users can save sounds"
  on public.saved_sounds for insert with check (auth.uid() = user_id);

create policy "Users can remove saved sounds"
  on public.saved_sounds for delete using (auth.uid() = user_id);
