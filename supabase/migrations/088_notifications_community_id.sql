-- Attach optional community_id to notifications so clients can hide bell items
-- for circles the user muted on-device (see lib/circleExperience + notificationService).

alter table public.notifications
  add column if not exists community_id uuid references public.communities (id) on delete set null;

create index if not exists idx_notifications_user_unread_community
  on public.notifications (user_id, read)
  where read = false and community_id is not null;

COMMENT ON COLUMN public.notifications.community_id IS
  'When set, this notification originated inside a Circle; clients may suppress it if that community is locally muted.';

-- ---------------------------------------------------------------------------
-- Circle thread replies — thread already carries community_id
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
        'reply',
        'New reply in your circle thread',
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
-- Post engagement — first tagged community on the post (circle wall, etc.)
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
        'New comment on your post', new.post_id::text, false,
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
          'Someone replied to your comment', new.post_id::text, false,
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

create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner   uuid;
  v_community_id uuid;
  v_already      boolean;
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

    if v_post_owner is null or v_post_owner = new.user_id then
      return new;
    end if;

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
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_post_owner, new.user_id, 'like',
        'liked your post', new.post_id::text, false,
        v_community_id
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

create or replace function public.notify_on_post_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner   uuid;
  v_community_id uuid;
  v_already      boolean;
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
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_post_owner, new.user_id, 'save',
        'saved your post', new.post_id::text, false,
        v_community_id
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

create or replace function public.notify_on_post_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner   uuid;
  v_community_id uuid;
begin
  begin
    if new.user_id is null then
      return new;
    end if;

    select p.creator_id,
           case
             when p.communities is not null and cardinality(p.communities) > 0
               then (p.communities[1])::uuid
             else null
           end
      into v_post_owner, v_community_id
    from public.posts p
    where p.id = new.post_id;

    if v_post_owner is null or v_post_owner = new.user_id then
      return new;
    end if;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
    values (
      v_post_owner, new.user_id, 'share',
      'shared your post', new.post_id::text, false,
      v_community_id
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

-- Backfill circle-thread reply rows so mute filtering applies to historical bell items too.
update public.notifications n
set community_id = ct.community_id
from public.circle_threads ct
where n.type = 'reply'
  and n.message = 'New reply in your circle thread'
  and n.target_id = ct.id::text
  and n.community_id is null;

-- Backfill post-targeted rows (circle wall likes/comments/etc.) from posts.communities[1].
update public.notifications n
set community_id = x.comm_id
from (
  select
    n2.id as nid,
    case
      when p.communities is not null and cardinality(p.communities) > 0
        then (p.communities[1])::uuid
      else null
    end as comm_id
  from public.notifications n2
  join public.posts p on p.id::text = n2.target_id
  where n2.community_id is null
    and n2.target_id is not null
    and n2.type in ('comment', 'reply', 'like', 'save', 'share')
) x
where n.id = x.nid
  and x.comm_id is not null;
