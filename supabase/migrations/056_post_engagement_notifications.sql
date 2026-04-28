-- 056 — Notify post creators when people engage with their content.
--
-- Before this migration, the only engagement notification the DB emitted
-- was `comment` (via migration 033). Likes, saves, and shares all wrote
-- silently — creators never saw the heart / bookmark / paper-plane bump
-- in their bell, so the app felt dead even while interactions were
-- piling up in the background.
--
-- This migration is idempotent. It:
--   1. Re-asserts `notify_on_comment()` and its trigger on `comments`
--      (safety net in case migration 033 never landed on this project).
--   2. Adds `notify_on_post_like()` + trigger on `post_likes`.
--   3. Adds `notify_on_post_save()` + trigger on `saved_posts`.
--   4. Adds `notify_on_post_share()` + trigger on `post_shares`.
--
-- Design choices:
--   - Actor never notifies themselves. The creator `<>` author guard is on
--     every path.
--   - Likes and saves de-dupe inside a 24h window: a user who like-unlike-
--     likes in a loop only spams one row per day, keeping the bell clean.
--   - Shares do NOT de-dupe: each share is a discrete reach event and the
--     creator genuinely wants to know every time their content gets
--     re-broadcast.
--   - Every trigger body is wrapped in `begin ... exception when others`
--     and errors route to `trigger_errors` via `log_trigger_error` — the
--     same pattern established in migration 039. A bad notification can
--     never roll back the user's primary write (like / save / share /
--     comment).

-- ---------------------------------------------------------------------------
-- 1. Comments — re-assert the notification trigger (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner   uuid;
  v_parent_owner uuid;
begin
  begin
    select creator_id into v_post_owner from public.posts where id = new.post_id;
    if v_post_owner is not null and v_post_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_post_owner, new.author_id, 'comment',
        'New comment on your post', new.post_id::text, false
      );
    end if;

    if new.parent_id is not null then
      select author_id into v_parent_owner from public.comments where id = new.parent_id;
      if v_parent_owner is not null
         and v_parent_owner <> new.author_id
         and (v_parent_owner is distinct from v_post_owner) then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read)
        values (
          v_parent_owner, new.author_id, 'reply',
          'Someone replied to your comment', new.post_id::text, false
        );
      end if;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_comment', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_comment on public.comments;
create trigger tr_notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------------------
-- 2. Likes — notify creator, de-dupe within 24h per (creator, actor, post)
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
  v_already    boolean;
begin
  begin
    select creator_id into v_post_owner from public.posts where id = new.post_id;
    if v_post_owner is null or v_post_owner = new.user_id then
      return new;
    end if;

    /* De-dupe: a like->unlike->like loop shouldn't re-notify. We only emit
       if no `like` notification already exists for this creator+actor+post
       in the last 24h. Over that horizon a fresh engagement is noteworthy
       again and we surface it a second time. */
    select exists (
      select 1
      from public.notifications n
      where n.user_id    = v_post_owner
        and n.actor_id   = new.user_id
        and n.type       = 'like'
        and n.target_id  = new.post_id::text
        and n.created_at >= now() - interval '24 hours'
    ) into v_already;

    if not v_already then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_post_owner, new.user_id, 'like',
        'liked your post', new.post_id::text, false
      );
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_post_like', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.post_id, 'user_id', new.user_id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_post_like on public.post_likes;
create trigger tr_notify_on_post_like
  after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- ---------------------------------------------------------------------------
-- 3. Saves — notify creator, same 24h de-dupe rule as likes
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_post_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
  v_already    boolean;
begin
  begin
    select creator_id into v_post_owner from public.posts where id = new.post_id;
    if v_post_owner is null or v_post_owner = new.user_id then
      return new;
    end if;

    select exists (
      select 1
      from public.notifications n
      where n.user_id    = v_post_owner
        and n.actor_id   = new.user_id
        and n.type       = 'save'
        and n.target_id  = new.post_id::text
        and n.created_at >= now() - interval '24 hours'
    ) into v_already;

    if not v_already then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_post_owner, new.user_id, 'save',
        'saved your post', new.post_id::text, false
      );
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_post_save', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.post_id, 'user_id', new.user_id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_post_save on public.saved_posts;
create trigger tr_notify_on_post_save
  after insert on public.saved_posts
  for each row execute function public.notify_on_post_save();

-- ---------------------------------------------------------------------------
-- 4. Shares — notify creator every time (no de-dupe; each share is a
--    distinct reach event and anonymous shares with user_id=null are
--    silently dropped because we can't identify the actor).
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_post_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  begin
    if new.user_id is null then
      return new;
    end if;

    select creator_id into v_post_owner from public.posts where id = new.post_id;
    if v_post_owner is null or v_post_owner = new.user_id then
      return new;
    end if;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      v_post_owner, new.user_id, 'share',
      'shared your post', new.post_id::text, false
    );
  exception when others then
    perform public.log_trigger_error(
      'notify_on_post_share', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.post_id, 'user_id', new.user_id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_post_share on public.post_shares;
create trigger tr_notify_on_post_share
  after insert on public.post_shares
  for each row execute function public.notify_on_post_share();
