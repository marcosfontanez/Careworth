-- Circles closed-beta risk hardening:
-- 1) Require community membership to post wall content / threads / replies
-- 2) Cap circle_new_post notification fan-out per post
-- 3) Allow staff to delete circle_threads from mobile admin (RLS parity with posts)

-- ---------------------------------------------------------------------------
-- 1. Membership helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_member_of_community(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = p_community_id
      and cm.user_id = p_user_id
  );
$$;

comment on function public.is_member_of_community(uuid, uuid) is
  'True when p_user_id has joined p_community_id. Used by Circles posting RLS.';

create or replace function public.user_is_member_of_all_post_communities(
  p_communities text[],
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid text;
begin
  if p_user_id is null then
    return false;
  end if;
  if p_communities is null or cardinality(p_communities) < 1 then
    return true;
  end if;
  foreach cid in array p_communities
  loop
    if cid is null or btrim(cid) = '' then
      continue;
    end if;
    if not public.is_member_of_community(cid::uuid, p_user_id) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

comment on function public.user_is_member_of_all_post_communities(text[], uuid) is
  'Circles wall posts must tag communities the author has joined; empty array passes.';

-- ---------------------------------------------------------------------------
-- 1b. Posting RLS — membership required for circle-tagged content
-- ---------------------------------------------------------------------------
drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert
  with check (
    (select auth.uid()) = creator_id
    and public.user_is_member_of_all_post_communities(communities, (select auth.uid()))
  );

drop policy if exists "Authenticated users can create threads" on public.circle_threads;
create policy "Authenticated users can create threads"
  on public.circle_threads for insert
  with check (
    (select auth.uid()) = author_id
    and public.is_member_of_community(community_id, (select auth.uid()))
  );

drop policy if exists "Authenticated users can post replies" on public.circle_replies;
create policy "Authenticated users can post replies"
  on public.circle_replies for insert
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.circle_threads ct
      where ct.id = thread_id
        and public.is_member_of_community(ct.community_id, (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Notification fan-out cap (max 250 members per new wall post per community)
-- ---------------------------------------------------------------------------
create or replace function public.notify_community_members_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid_text text;
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

      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      select
        cm.user_id,
        new.creator_id,
        'circle_new_post',
        'New post in a circle you joined',
        new.id::text,
        false,
        cid_text::uuid
      from public.community_members cm
      where cm.community_id = cid_text::uuid
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

comment on function public.notify_community_members_on_new_post() is
  'Notifies joined members of new circle wall posts; capped at 250 recipients per community tag.';

-- ---------------------------------------------------------------------------
-- 3. Staff moderation delete for circle_threads
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can delete circle threads for moderation" on public.circle_threads;
create policy "Admins can delete circle threads for moderation"
  on public.circle_threads for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

comment on policy "Admins can delete circle threads for moderation" on public.circle_threads is
  'Mobile/web staff console can remove reported discussions (profiles.role_admin).';
