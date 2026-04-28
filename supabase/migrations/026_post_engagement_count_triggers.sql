-- Keep posts.like_count, posts.comment_count, and posts.save_count in sync with child rows.

-- ---------------------------------------------------------------------------
-- Likes
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
-- Comments (all rows on a post, including replies)
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
-- Saves (saved_posts)
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
-- One-time backfill from existing rows
-- ---------------------------------------------------------------------------
update public.posts p
set like_count = coalesce((select count(*)::int from public.post_likes pl where pl.post_id = p.id), 0);

update public.posts p
set comment_count = coalesce((select count(*)::int from public.comments c where c.post_id = p.id), 0);

update public.posts p
set save_count = coalesce((select count(*)::int from public.saved_posts sp where sp.post_id = p.id), 0);
