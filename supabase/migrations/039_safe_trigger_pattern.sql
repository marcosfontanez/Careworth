-- Safety net for ALL denormalisation / notification triggers.
--
-- Background: in 037 we hit a single PL/pgSQL bug inside one trigger function
-- (sync_community_post_counts_for_post) that raised "FOREACH expression must
-- not be null" and rolled back the entire transaction -- which silently broke
-- liking, commenting and saving. The fix in 037 was correct, but the lesson
-- is bigger: any throw inside a denormalisation trigger will reject the
-- user's primary write, and a single bad migration can take down engagement
-- across the whole product.
--
-- This migration:
--   1. Creates a `trigger_errors` audit table to capture failures.
--   2. Re-defines every denormalisation / notification trigger function so
--      the body is wrapped in EXCEPTION WHEN OTHERS. On any failure we log
--      the error to `trigger_errors` and return the row -- so the user's
--      INSERT / UPDATE / DELETE on the source table commits regardless.
--   3. Re-applies the FOREACH fix from 037 (idempotent) inside the safety
--      wrapper so future re-runs always end in a known-good state.
--
-- Net effect: cached counts may temporarily drift if a trigger throws, but
-- the user's like / comment / save / follow always succeeds and we have a
-- log row to investigate from.

-- ---------------------------------------------------------------------------
-- Telemetry table
-- ---------------------------------------------------------------------------
create table if not exists public.trigger_errors (
  id          bigserial primary key,
  fn_name     text not null,
  tg_op       text,
  table_name  text,
  err_state   text,
  err_message text,
  context     jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists ix_trigger_errors_time
  on public.trigger_errors (occurred_at desc);

create index if not exists ix_trigger_errors_fn_time
  on public.trigger_errors (fn_name, occurred_at desc);

alter table public.trigger_errors enable row level security;
-- No policies => only service_role / superuser can read. Clients are blocked.
revoke select, insert, update, delete on public.trigger_errors from anon, authenticated;

-- Helper: log one failure. Always best-effort.
create or replace function public.log_trigger_error(
  p_fn text, p_op text, p_table text, p_state text, p_message text, p_context jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.trigger_errors (fn_name, tg_op, table_name, err_state, err_message, context)
    values (p_fn, p_op, p_table, p_state, p_message, coalesce(p_context, '{}'::jsonb));
  exception when others then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 026 -- post engagement counts (likes / comments / saves)
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.posts set like_count = like_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_post_like_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.post_id, old.post_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_post_comment_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.post_id, old.post_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_post_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.posts set save_count = save_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set save_count = greatest(0, save_count - 1) where id = old.post_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_post_save_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.post_id, old.post_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 033 -- profile activity touch
-- ---------------------------------------------------------------------------
create or replace function public.touch_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_table_name = 'comments' then
      update public.profiles set updated_at = now() where id = new.author_id;
    elsif tg_table_name = 'posts' then
      update public.profiles set updated_at = now() where id = new.creator_id;
    elsif tg_table_name = 'circle_replies' then
      update public.profiles set updated_at = now() where id = new.author_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'touch_profile_activity', tg_op, tg_table_name, sqlstate, sqlerrm, '{}'::jsonb
    );
  end;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 033 -- comment notifications
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
  v_parent_owner uuid;
begin
  begin
    select creator_id into v_post_owner from public.posts where id = new.post_id;
    if v_post_owner is not null and v_post_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_post_owner, new.author_id, 'comment',
        'New reply on your post', new.post_id::text, false
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

-- ---------------------------------------------------------------------------
-- 033 -- circle reply notifications
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_circle_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_author uuid;
begin
  begin
    select author_id into v_thread_author from public.circle_threads where id = new.thread_id;
    if v_thread_author is not null and v_thread_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_thread_author, new.author_id, 'reply',
        'New reply in your circle thread', new.thread_id::text, false
      );
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_circle_reply', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('thread_id', new.thread_id, 'reply_id', new.id)
    );
  end;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 033 -- community member count
-- ---------------------------------------------------------------------------
create or replace function public.sync_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  begin
    cid := coalesce(new.community_id, old.community_id);
    if cid is null then
      return coalesce(new, old);
    end if;
    update public.communities c
    set member_count = (select count(*)::int from public.community_members m where m.community_id = cid)
    where c.id = cid;
  exception when others then
    perform public.log_trigger_error(
      'sync_community_member_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('community_id', coalesce(new.community_id, old.community_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 033 + 037 -- community post counts (now safety-wrapped, FOREACH fix retained)
-- ---------------------------------------------------------------------------
create or replace function public.sync_community_post_counts_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cids text[];
  cid  text;
begin
  begin
    if tg_op = 'INSERT' then
      cids := coalesce(new.communities, '{}'::text[]);
    elsif tg_op = 'DELETE' then
      cids := coalesce(old.communities, '{}'::text[]);
    elsif tg_op = 'UPDATE' then
      -- 037 fix: materialise via array() so FOREACH never sees NULL.
      cids := coalesce(
        array(
          select distinct unnest(
            coalesce(old.communities, '{}'::text[])
            || coalesce(new.communities, '{}'::text[])
          )
        ),
        '{}'::text[]
      );
    else
      cids := '{}'::text[];
    end if;

    if cids is not null and array_length(cids, 1) is not null then
      foreach cid in array cids loop
        perform public.recount_community_posts(cid);
      end loop;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_community_post_counts_for_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.id, old.id))
    );
  end;
  return coalesce(new, old);
end;
$$;
