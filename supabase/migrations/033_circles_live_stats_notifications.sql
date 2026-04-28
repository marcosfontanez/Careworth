-- Live community card stats, profile activity bump, post notifications, sync community counts.

-- Bump profile.updated_at on engagement so "recently active" members can be surfaced.
create or replace function public.touch_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'comments' then
    update public.profiles set updated_at = now() where id = new.author_id;
  elsif tg_table_name = 'posts' then
    update public.profiles set updated_at = now() where id = new.creator_id;
  elsif tg_table_name = 'circle_replies' then
    update public.profiles set updated_at = now() where id = new.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_touch_profile_on_comment on public.comments;
create trigger tr_touch_profile_on_comment
  after insert on public.comments
  for each row execute function public.touch_profile_activity();

drop trigger if exists tr_touch_profile_on_post on public.posts;
create trigger tr_touch_profile_on_post
  after insert on public.posts
  for each row execute function public.touch_profile_activity();

drop trigger if exists tr_touch_profile_on_circle_reply on public.circle_replies;
create trigger tr_touch_profile_on_circle_reply
  after insert on public.circle_replies
  for each row execute function public.touch_profile_activity();

-- Notify post author (and parent comment author for replies) on new comments.
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
  select creator_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner is not null and v_post_owner <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      v_post_owner,
      new.author_id,
      'comment',
      'New reply on your post',
      new.post_id::text,
      false
    );
  end if;

  if new.parent_id is not null then
    select author_id into v_parent_owner from public.comments where id = new.parent_id;
    if v_parent_owner is not null
       and v_parent_owner <> new.author_id
       and (v_parent_owner is distinct from v_post_owner) then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        v_parent_owner,
        new.author_id,
        'reply',
        'Someone replied to your comment',
        new.post_id::text,
        false
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_notify_on_comment on public.comments;
create trigger tr_notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Circle thread reply: notify thread author (not self).
create or replace function public.notify_on_circle_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_author uuid;
begin
  select author_id into v_thread_author from public.circle_threads where id = new.thread_id;
  if v_thread_author is not null and v_thread_author <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      v_thread_author,
      new.author_id,
      'reply',
      'New reply in your circle thread',
      new.thread_id::text,
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_circle_reply on public.circle_replies;
create trigger tr_notify_on_circle_reply
  after insert on public.circle_replies
  for each row execute function public.notify_on_circle_reply();

-- Keep communities.member_count in sync with community_members.
create or replace function public.sync_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := coalesce(new.community_id, old.community_id);
  if cid is null then
    return coalesce(new, old);
  end if;
  update public.communities c
  set member_count = (select count(*)::int from public.community_members m where m.community_id = cid)
  where c.id = cid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_sync_member_count_ins on public.community_members;
create trigger tr_sync_member_count_ins
  after insert on public.community_members
  for each row execute function public.sync_community_member_count();

drop trigger if exists tr_sync_member_count_del on public.community_members;
create trigger tr_sync_member_count_del
  after delete on public.community_members
  for each row execute function public.sync_community_member_count();

-- Keep communities.post_count in sync (posts.communities is text[] of community UUID strings).
create or replace function public.recount_community_posts(target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_id is null or btrim(target_id) = '' then
    return;
  end if;
  update public.communities c
  set post_count = (
    select count(*)::int from public.posts p
    where p.communities @> array[btrim(target_id)]
  )
  where c.id::text = btrim(target_id);
end;
$$;

create or replace function public.sync_community_post_counts_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text;
begin
  if tg_op = 'INSERT' then
    foreach cid in array coalesce(new.communities, '{}')
    loop
      perform public.recount_community_posts(cid);
    end loop;
  elsif tg_op = 'DELETE' then
    foreach cid in array coalesce(old.communities, '{}')
    loop
      perform public.recount_community_posts(cid);
    end loop;
  elsif tg_op = 'UPDATE' then
    foreach cid in array (
      select distinct unnest(coalesce(old.communities, '{}') || coalesce(new.communities, '{}'))
    )
    loop
      perform public.recount_community_posts(cid);
    end loop;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_sync_comm_post_count on public.posts;
create trigger tr_sync_comm_post_count
  after insert or update or delete on public.posts
  for each row execute function public.sync_community_post_counts_for_post();

-- One round-trip for Circles featured cards: members, posts, online, sample avatars.
create or replace function public.get_community_card_stats(p_ids uuid[])
returns table (
  community_id uuid,
  member_count bigint,
  post_count bigint,
  online_count bigint,
  avatar_urls text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id as community_id,
    (select count(*)::bigint from public.community_members m where m.community_id = c.id) as member_count,
    (select count(*)::bigint from public.posts p where p.communities @> array[c.id::text]) as post_count,
    (
      select count(distinct m.user_id)::bigint
      from public.community_members m
      join public.profiles pr on pr.id = m.user_id
      where m.community_id = c.id
        and pr.updated_at > now() - interval '30 minutes'
    ) as online_count,
    coalesce(
      (
        select array_agg(sub.avatar_url)
        from (
          select pr.avatar_url
          from public.community_members cm
          join public.profiles pr on pr.id = cm.user_id
          where cm.community_id = c.id
            and coalesce(pr.avatar_url, '') <> ''
          order by
            case when pr.updated_at > now() - interval '30 minutes' then 0 else 1 end,
            pr.updated_at desc nulls last
          limit 5
        ) sub
      ),
      '{}'::text[]
    ) as avatar_urls
  from public.communities c
  where c.id = any(p_ids);
$$;

grant execute on function public.get_community_card_stats(uuid[]) to authenticated;
grant execute on function public.get_community_card_stats(uuid[]) to anon;

-- Backfill cached counts from live data (one-time alignment).
update public.communities c
set member_count = (select count(*)::int from public.community_members m where m.community_id = c.id);

update public.communities c
set post_count = (select count(*)::int from public.posts p where p.communities @> array[c.id::text]);
