-- My 5 profile updates + Circles threads/replies (live data; replaces client mock stores)

-- ─── Circle threads ─────────────────────────────────────────
create table if not exists public.circle_threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('question', 'story', 'advice', 'meme', 'media')),
  title text not null,
  body text not null default '',
  media_thumb_url text,
  linked_post_id uuid references public.posts(id) on delete set null,
  reply_count int not null default 0,
  reaction_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_circle_threads_community on public.circle_threads(community_id, created_at desc);

alter table public.circle_threads enable row level security;

create policy "Circle threads are readable by everyone"
  on public.circle_threads for select using (true);

create policy "Authenticated users can create threads"
  on public.circle_threads for insert with check (auth.uid() = author_id);

create policy "Authors can update own threads"
  on public.circle_threads for update using (auth.uid() = author_id);

create policy "Authors can delete own threads"
  on public.circle_threads for delete using (auth.uid() = author_id);

-- ─── Circle replies ─────────────────────────────────────────
create table if not exists public.circle_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.circle_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  reaction_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_circle_replies_thread on public.circle_replies(thread_id, created_at asc);

alter table public.circle_replies enable row level security;

create policy "Circle replies are readable by everyone"
  on public.circle_replies for select using (true);

create policy "Authenticated users can post replies"
  on public.circle_replies for insert with check (auth.uid() = author_id);

create policy "Authors can update own replies"
  on public.circle_replies for update using (auth.uid() = author_id);

create policy "Authors can delete own replies"
  on public.circle_replies for delete using (auth.uid() = author_id);

create or replace function public.bump_circle_thread_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.circle_threads
    set reply_count = reply_count + 1,
        updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

comment on function public.bump_circle_thread_reply_count() is 'Increments circle_threads.reply_count after a reply is inserted.';

drop trigger if exists tr_circle_replies_bump on public.circle_replies;
create trigger tr_circle_replies_bump
  after insert on public.circle_replies
  for each row execute function public.bump_circle_thread_reply_count();

-- ─── Profile updates (My 5) ─────────────────────────────────
create table if not exists public.profile_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('thought', 'status', 'link_post', 'link_circle', 'link_live', 'media_note')),
  content text not null,
  preview_text text,
  mood text,
  linked_post_id uuid references public.posts(id) on delete set null,
  linked_circle_id uuid references public.communities(id) on delete set null,
  linked_circle_slug text,
  linked_discussion_title text,
  linked_thread_id uuid references public.circle_threads(id) on delete set null,
  linked_live_id text,
  media_thumb text,
  linked_url text,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_updates_user on public.profile_updates(user_id, created_at desc);

alter table public.profile_updates enable row level security;

create policy "Profile updates readable by everyone"
  on public.profile_updates for select using (true);

create policy "Users manage own profile updates"
  on public.profile_updates for insert with check (auth.uid() = user_id);

create policy "Users update own profile updates"
  on public.profile_updates for update using (auth.uid() = user_id);

create policy "Users delete own profile updates"
  on public.profile_updates for delete using (auth.uid() = user_id);
