-- Show comment / reply body in notification.message (truncated) instead of generic copy.
-- Circle thread inserts use type `circle_thread_reply` so clients can route without matching
-- a fixed message string (legacy rows still use type `reply` + old message).

create or replace function public.notification_message_preview(
  p_raw text,
  p_fallback text,
  p_max_len int default 240
)
returns text
language plpgsql
immutable
as $$
declare
  t text;
begin
  if p_raw is null then
    return p_fallback;
  end if;
  t := trim(p_raw);
  if length(t) = 0 then
    return p_fallback;
  end if;
  if length(t) > p_max_len then
    return left(t, p_max_len) || '…';
  end if;
  return t;
end;
$$;

comment on function public.notification_message_preview(text, text, int) is
  'Truncates user text for notifications.message; whitespace-only uses fallback.';

-- ---------------------------------------------------------------------------
-- Post comments (088) — include comment body
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner    uuid;
  v_parent_owner  uuid;
  v_community_id uuid;
begin
  begin
    select p.creator_id,
           case
             when p.communities is not null and cardinality(p.communities) > 0
               then (p.communities[1])::uuid
             else null
           end
      into v_post_owner, v_community_id
    from public.posts p
    where p.id = new.post_id;

    if v_post_owner is not null and v_post_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_post_owner, new.author_id, 'comment',
        public.notification_message_preview(new.content, 'New comment on your post', 240),
        new.post_id::text, false,
        v_community_id
      );
    end if;

    if new.parent_id is not null then
      select c.author_id into v_parent_owner from public.comments c where c.id = new.parent_id;
      if v_parent_owner is not null
         and v_parent_owner <> new.author_id
         and (v_parent_owner is distinct from v_post_owner) then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
        values (
          v_parent_owner, new.author_id, 'reply',
          public.notification_message_preview(new.content, 'Someone replied to your comment', 240),
          new.post_id::text, false,
          v_community_id
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
-- Circle thread replies — body preview + distinct type for routing / push
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_circle_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_author uuid;
  v_community_id  uuid;
begin
  begin
    select ct.author_id, ct.community_id
      into v_thread_author, v_community_id
    from public.circle_threads ct
    where ct.id = new.thread_id;

    if v_thread_author is not null and v_thread_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_thread_author,
        new.author_id,
        'circle_thread_reply',
        public.notification_message_preview(new.body, 'New reply in your circle thread', 240),
        new.thread_id::text,
        false,
        v_community_id
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
-- My Pulse card comments
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_profile_update_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner        uuid;
  v_parent_owner uuid;
begin
  begin
    select pu.user_id
      into v_owner
    from public.profile_updates pu
    where pu.id = new.update_id;

    if v_owner is not null and v_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_owner,
        new.author_id,
        'comment',
        public.notification_message_preview(new.content, 'New comment on your Pulse', 240),
        'profile_update:' || new.update_id::text,
        false
      );
    end if;

    if new.parent_id is not null then
      select c.author_id
        into v_parent_owner
      from public.profile_update_comments c
      where c.id = new.parent_id;

      if v_parent_owner is not null
         and v_parent_owner <> new.author_id
         and (v_parent_owner is distinct from v_owner) then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read)
        values (
          v_parent_owner,
          new.author_id,
          'reply',
          public.notification_message_preview(new.content, 'Someone replied to your comment', 240),
          'profile_update:' || new.update_id::text,
          false
        );
      end if;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_profile_update_comment', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('update_id', new.update_id, 'comment_id', new.id)
    );
  end;
  return new;
end;
$$;
