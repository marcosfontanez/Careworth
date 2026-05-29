-- Sprint 2C: Confessions privacy — viewer-safe comments, notification actor redaction,
-- nullable notification actor_id for pseudonymous fan-out.

-- ---------------------------------------------------------------------------
-- 1. Allow null actor_id on notifications (pseudonymous Confessions alerts)
-- ---------------------------------------------------------------------------
alter table public.notifications
  alter column actor_id drop not null;

comment on column public.notifications.actor_id is
  'Actor profile; null for pseudonymous Confessions / anonymous-post alerts to non-staff recipients.';

-- ---------------------------------------------------------------------------
-- 2. Confessions community helper
-- ---------------------------------------------------------------------------
create or replace function public.community_is_confessions(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = p_community_id
      and lower(c.slug) = 'confessions'
  );
$$;

comment on function public.community_is_confessions(uuid) is
  'True when community slug is confessions (anonymous room).';

-- ---------------------------------------------------------------------------
-- 3. Viewer-safe comments (mask author_id when parent post is anonymous)
-- ---------------------------------------------------------------------------
drop view if exists public.comments_viewer_safe;

create view public.comments_viewer_safe
with (security_invoker = true) as
select
  c.id,
  c.post_id,
  c.parent_id,
  public.viewer_safe_creator_id(c.author_id, coalesce(p.is_anonymous, false)) as author_id,
  c.content,
  c.like_count,
  c.is_pinned,
  c.created_at,
  c.deleted_at,
  c.edited_at,
  c.media_url,
  c.reaction_heart_count,
  c.reaction_haha_count,
  c.reaction_wow_count,
  c.reaction_sad_count,
  c.reaction_angry_count,
  c.reaction_clap_count
from public.comments c
join public.posts p on p.id = c.post_id;

comment on view public.comments_viewer_safe is
  'Comment reads: masks author_id when parent post is anonymous unless viewer is author or staff.';

grant select on public.comments_viewer_safe to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. circle_new_post — redact actor + message for anonymous / Confessions posts
--    (preserves 250 cap + notify_new_posts + author exclusion from migration 216)
-- ---------------------------------------------------------------------------
create or replace function public.notify_community_members_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid_text text;
  v_community_id uuid;
  v_redact_actor boolean;
  v_message text;
begin
  begin
    if coalesce(new.scheduled_status, 'live') is distinct from 'live' then
      return new;
    end if;
    if new.communities is null or cardinality(new.communities) < 1 then
      return new;
    end if;

    foreach cid_text in array new.communities
    loop
      if cid_text is null or btrim(cid_text) = '' then
        continue;
      end if;

      v_community_id := cid_text::uuid;
      v_redact_actor := coalesce(new.is_anonymous, false)
        or public.community_is_confessions(v_community_id);

      if v_redact_actor and public.community_is_confessions(v_community_id) then
        v_message := 'New anonymous post in Confessions';
      elsif v_redact_actor then
        v_message := 'New anonymous post in a circle you joined';
      else
        v_message := 'New post in a circle you joined';
      end if;

      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      select
        cm.user_id,
        case when v_redact_actor then null else new.creator_id end,
        'circle_new_post',
        v_message,
        new.id::text,
        false,
        v_community_id
      from public.community_members cm
      where cm.community_id = v_community_id
        and cm.user_id is distinct from new.creator_id
        and cm.notify_new_posts is true
      order by cm.joined_at desc
      limit 250;
    end loop;
  exception when others then
    perform public.log_trigger_error(
      'notify_community_members_on_new_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Post comment notifications — redact actor when parent post is anonymous
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
  v_community_id  uuid;
  v_is_anonymous  boolean;
  v_actor_id      uuid;
begin
  begin
    select p.creator_id,
           coalesce(p.is_anonymous, false),
           case
             when p.communities is not null and cardinality(p.communities) > 0
               then (p.communities[1])::uuid
             else null
           end
      into v_post_owner, v_is_anonymous, v_community_id
    from public.posts p
    where p.id = new.post_id;

    v_actor_id := case when v_is_anonymous then null else new.author_id end;

    if v_post_owner is not null and v_post_owner <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_post_owner,
        v_actor_id,
        'comment',
        public.notification_message_preview(new.content, 'New comment on your post', 240),
        new.post_id::text,
        false,
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
          v_parent_owner,
          v_actor_id,
          'reply',
          public.notification_message_preview(new.content, 'Someone replied to your comment', 240),
          new.post_id::text,
          false,
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
-- 6. Circle thread reply notifications — redact actor in Confessions
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
  v_redact_actor  boolean;
  v_actor_id      uuid;
  v_message       text;
begin
  begin
    select ct.author_id, ct.community_id
      into v_thread_author, v_community_id
    from public.circle_threads ct
    where ct.id = new.thread_id;

    v_redact_actor := public.community_is_confessions(v_community_id);
    v_actor_id := case when v_redact_actor then null else new.author_id end;
    v_message := case
      when v_redact_actor then
        public.notification_message_preview(new.body, 'New anonymous reply in Confessions', 240)
      else
        public.notification_message_preview(new.body, 'New reply in your circle thread', 240)
    end;

    if v_thread_author is not null and v_thread_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      values (
        v_thread_author,
        v_actor_id,
        'circle_thread_reply',
        v_message,
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
