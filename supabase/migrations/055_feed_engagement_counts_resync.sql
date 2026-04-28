-- Fix: feed cards showed 0 for likes / comments / favorites / shares even
-- after the user just tapped -- because one or more of the count triggers
-- (migrations 026 + 040) had never been applied to this project, or had
-- been dropped in a prior schema reset.
--
-- This migration is idempotent: it re-declares all four `posts.<field>_count`
-- triggers, (re)creates the `post_shares` table when missing, and finally
-- resyncs every denormalised count from the ground-truth child tables.
-- Re-running it is safe -- `create or replace` preserves grants, the DDL
-- uses `if not exists`, and the backfills are pure UPDATEs.

-- ---------------------------------------------------------------------------
-- post_shares (table + RLS) -- mirrors 040; safe if 040 already ran.
-- ---------------------------------------------------------------------------
create table if not exists public.post_shares (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete set null,
  post_id    uuid not null references public.posts(id) on delete cascade,
  channel    text,
  created_at timestamptz not null default now()
);

create index if not exists ix_post_shares_post_time
  on public.post_shares (post_id, created_at desc);

create index if not exists ix_post_shares_user_time
  on public.post_shares (user_id, created_at desc);

alter table public.post_shares enable row level security;

drop policy if exists "post_shares_select_all" on public.post_shares;
create policy "post_shares_select_all" on public.post_shares
  for select using (true);

drop policy if exists "post_shares_insert_self" on public.post_shares;
create policy "post_shares_insert_self" on public.post_shares
  for insert with check (auth.uid() = user_id or user_id is null);

-- ---------------------------------------------------------------------------
-- Like count: posts.like_count <- post_likes rowcount
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_post_likes_sync_count on public.post_likes;
create trigger trg_post_likes_sync_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

-- ---------------------------------------------------------------------------
-- Comment count: posts.comment_count <- comments rowcount
-- Counts every comment row (including replies) so the feed rail shows the
-- full conversation volume. Soft-deletes (deleted_at) leave the row behind
-- deliberately -- we don't decrement when a comment is tombstoned so the
-- visible thread size stays stable.
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_comments_sync_post_count on public.comments;
create trigger trg_comments_sync_post_count
  after insert or delete on public.comments
  for each row execute function public.sync_post_comment_count();

-- ---------------------------------------------------------------------------
-- Save count: posts.save_count <- saved_posts rowcount
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set save_count = save_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set save_count = greatest(0, save_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_saved_posts_sync_count on public.saved_posts;
create trigger trg_saved_posts_sync_count
  after insert or delete on public.saved_posts
  for each row execute function public.sync_post_save_count();

-- ---------------------------------------------------------------------------
-- Share count: posts.share_count <- post_shares rowcount
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_share_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set share_count = share_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set share_count = greatest(0, share_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_post_shares_sync_count on public.post_shares;
create trigger tr_post_shares_sync_count
  after insert or delete on public.post_shares
  for each row execute function public.sync_post_share_count();

-- ---------------------------------------------------------------------------
-- One-shot backfill: reconcile every denormalised count against the actual
-- child rows. Handles historical drift from any period the triggers were
-- missing or disabled. Uses `is distinct from` so rows that are already
-- correct don't get rewritten (keeps the updated_at stable on posts).
-- ---------------------------------------------------------------------------
update public.posts p
set like_count = sub.ct
from (
  select post_id, count(*)::int as ct
  from public.post_likes
  group by post_id
) sub
where sub.post_id = p.id
  and p.like_count is distinct from sub.ct;

update public.posts p
set like_count = 0
where not exists (select 1 from public.post_likes pl where pl.post_id = p.id)
  and p.like_count <> 0;

update public.posts p
set comment_count = sub.ct
from (
  select post_id, count(*)::int as ct
  from public.comments
  group by post_id
) sub
where sub.post_id = p.id
  and p.comment_count is distinct from sub.ct;

update public.posts p
set comment_count = 0
where not exists (select 1 from public.comments c where c.post_id = p.id)
  and p.comment_count <> 0;

update public.posts p
set save_count = sub.ct
from (
  select post_id, count(*)::int as ct
  from public.saved_posts
  group by post_id
) sub
where sub.post_id = p.id
  and p.save_count is distinct from sub.ct;

update public.posts p
set save_count = 0
where not exists (select 1 from public.saved_posts sp where sp.post_id = p.id)
  and p.save_count <> 0;

update public.posts p
set share_count = sub.ct
from (
  select post_id, count(*)::int as ct
  from public.post_shares
  group by post_id
) sub
where sub.post_id = p.id
  and p.share_count is distinct from sub.ct;

update public.posts p
set share_count = 0
where not exists (select 1 from public.post_shares ps where ps.post_id = p.id)
  and p.share_count <> 0;
