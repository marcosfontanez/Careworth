-- Migration 054 · My Pulse engagement (likes + comments on profile_updates)
--
-- Before this migration the `profile_updates` table had `like_count` and
-- `comment_count` columns but no backing tables, so the heart / comment /
-- share buttons on My Pulse cards rendered but did nothing: `onLike` and
-- `onComment` were `undefined` all the way down from MyPulseItemCard.
--
-- This adds the two tables we actually need plus count-sync triggers so
-- the columns stay accurate without the client having to do optimistic
-- bookkeeping:
--
--   1. `profile_update_likes`    — (user_id, update_id) with unique pair.
--   2. `profile_update_comments` — threaded comments on a profile_update.
--   3. Two trigger functions that bump / decrement the denormalised
--      `like_count` / `comment_count` on `profile_updates` whenever rows
--      land in / leave the engagement tables.
--   4. `toggle_profile_update_like` RPC — the same "idempotent-toggle"
--      pattern the post_likes path uses, returning the new liked state
--      so the client can reconcile without an extra round-trip.

-- ─── Likes ───────────────────────────────────────────────────────────
create table if not exists public.profile_update_likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  update_id uuid not null references public.profile_updates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, update_id)
);

create index if not exists idx_pu_likes_update
  on public.profile_update_likes (update_id);
create index if not exists idx_pu_likes_user
  on public.profile_update_likes (user_id);

alter table public.profile_update_likes enable row level security;

-- Visibility mirrors the public-by-default stance of the rest of the
-- app: a like on someone's Pulse is public signal (it bumps their
-- pulse score, shows in notifications). Writes are locked to the
-- authenticated user acting as themselves — you can only (un)like as
-- you, not on behalf of someone else.
drop policy if exists "Pulse likes are viewable by everyone" on public.profile_update_likes;
create policy "Pulse likes are viewable by everyone"
  on public.profile_update_likes for select using (true);

drop policy if exists "Users can manage own pulse likes" on public.profile_update_likes;
create policy "Users can manage own pulse likes"
  on public.profile_update_likes for all using (auth.uid() = user_id);

-- ─── Comments ────────────────────────────────────────────────────────
-- Threaded with a self-referential parent_id so the client can render
-- one level of replies (matches how `public.comments` is shaped for the
-- main feed so the two engagement surfaces stay architecturally aligned).
create table if not exists public.profile_update_comments (
  id uuid primary key default uuid_generate_v4(),
  update_id uuid not null references public.profile_updates(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.profile_update_comments(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_pu_comments_update
  on public.profile_update_comments (update_id, created_at desc);
create index if not exists idx_pu_comments_parent
  on public.profile_update_comments (parent_id);

alter table public.profile_update_comments enable row level security;

drop policy if exists "Pulse comments are viewable by everyone" on public.profile_update_comments;
create policy "Pulse comments are viewable by everyone"
  on public.profile_update_comments for select using (true);

drop policy if exists "Users can insert own pulse comments" on public.profile_update_comments;
create policy "Users can insert own pulse comments"
  on public.profile_update_comments for insert with check (auth.uid() = author_id);

-- A commenter can delete their own comment. The Pulse OWNER can also
-- delete any comment on their own profile_update — matches the standard
-- "your wall, your moderation" expectation on social profiles.
drop policy if exists "Authors can delete own pulse comments" on public.profile_update_comments;
create policy "Authors can delete own pulse comments"
  on public.profile_update_comments for delete using (
    auth.uid() = author_id
    or auth.uid() = (
      select user_id from public.profile_updates where id = update_id
    )
  );

-- ─── Denormalised-count sync triggers ────────────────────────────────
-- Keeps `profile_updates.like_count` / `.comment_count` accurate without
-- the client having to patch the row optimistically. Written to be
-- security definer so RLS doesn't block the bump when the liker isn't
-- the profile owner.

create or replace function public.bump_profile_update_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.profile_updates
       set like_count = like_count + 1
     where id = NEW.update_id;
  elsif TG_OP = 'DELETE' then
    update public.profile_updates
       set like_count = greatest(like_count - 1, 0)
     where id = OLD.update_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profile_update_like_count on public.profile_update_likes;
create trigger trg_profile_update_like_count
  after insert or delete on public.profile_update_likes
  for each row execute function public.bump_profile_update_like_count();

create or replace function public.bump_profile_update_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.profile_updates
       set comment_count = comment_count + 1
     where id = NEW.update_id;
  elsif TG_OP = 'DELETE' then
    update public.profile_updates
       set comment_count = greatest(comment_count - 1, 0)
     where id = OLD.update_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profile_update_comment_count on public.profile_update_comments;
create trigger trg_profile_update_comment_count
  after insert or delete on public.profile_update_comments
  for each row execute function public.bump_profile_update_comment_count();

-- ─── Toggle RPC ──────────────────────────────────────────────────────
-- Returns the new liked state so the client can reconcile its cache
-- without having to read back. Same pattern as `postsService.toggleLike`
-- but wrapped in SQL so the insert / delete / unique-violation retry
-- logic all lives on the server.
create or replace function public.toggle_profile_update_like(p_update_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select id into v_existing
    from public.profile_update_likes
   where user_id = v_user
     and update_id = p_update_id;

  if v_existing is not null then
    delete from public.profile_update_likes where id = v_existing;
    return false;
  end if;

  insert into public.profile_update_likes (user_id, update_id)
       values (v_user, p_update_id);
  return true;
end;
$$;

grant execute on function public.toggle_profile_update_like(uuid) to authenticated;

-- ─── One-off: resync existing denormalised counts ────────────────────
-- Any `like_count` / `comment_count` that drifted before the triggers
-- existed gets snapped back to the truth. Safe to re-run because it's
-- a pure UPDATE-with-subquery — idempotent.
update public.profile_updates pu
   set like_count = coalesce((
         select count(*)::int from public.profile_update_likes l
          where l.update_id = pu.id
       ), 0),
       comment_count = coalesce((
         select count(*)::int from public.profile_update_comments c
          where c.update_id = pu.id
       ), 0);
