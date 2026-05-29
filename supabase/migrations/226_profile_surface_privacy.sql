-- Migration 226 · Profile surface privacy (My Pulse + profile content)
--
-- Before this migration, profile_updates and their engagement tables were
-- world-readable (SELECT using true). Private profiles hid Media Hub posts
-- in the client only — My Pulse rows, likes, comments, and direct
-- /my-pulse/[id] links were still readable via PostgREST.
--
-- This migration:
--   1. Adds viewer_can_read_profile_surface(owner_id) for reusable checks.
--   2. Gates profile_updates / likes / comments SELECT on that helper.
--   3. Hardens like/comment writes and toggle_profile_update_like RPC.
--
-- Followers-only and alias profile modes are intentionally deferred: any
-- privacy_mode other than 'private' is treated as public for profile content.

-- ---------------------------------------------------------------------------
-- 1. Reusable visibility helper
-- ---------------------------------------------------------------------------
create or replace function public.viewer_can_read_profile_surface(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select auth.uid()) is not distinct from p_owner_id
    or public.viewer_is_staff()
    or (
      not exists (
        select 1
        from public.blocked_users bu
        where (
          bu.blocker_id = (select auth.uid())
          and bu.blocked_id = p_owner_id
        )
        or (
          bu.blocker_id = p_owner_id
          and bu.blocked_id = (select auth.uid())
        )
      )
      and coalesce(
        (
          select pr.privacy_mode
          from public.profiles pr
          where pr.id = p_owner_id
        ),
        'public'
      ) <> 'private'
    );
$$;

comment on function public.viewer_can_read_profile_surface(uuid) is
  'True when the current viewer may read My Pulse / profile content for p_owner_id: owner, staff, or non-blocked viewer of a non-private profile. Followers/alias modes deferred — only private is restricted.';

-- ---------------------------------------------------------------------------
-- 2. profile_updates — replace world-readable SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "Profile updates readable by everyone" on public.profile_updates;

create policy "Profile updates readable with profile surface"
  on public.profile_updates for select
  using (public.viewer_can_read_profile_surface(user_id));

comment on policy "Profile updates readable with profile surface" on public.profile_updates is
  'My Pulse rows are no longer world-readable; private profiles and blocked relationships hide updates except for owner/staff.';

-- Owner INSERT/UPDATE/DELETE policies unchanged (025).

-- ---------------------------------------------------------------------------
-- 3. profile_update_likes — gate reads and inserts through parent update
-- ---------------------------------------------------------------------------
drop policy if exists "Pulse likes are viewable by everyone" on public.profile_update_likes;
drop policy if exists "Users can manage own pulse likes" on public.profile_update_likes;

create policy "Pulse likes viewable with profile surface"
  on public.profile_update_likes for select
  using (
    exists (
      select 1
      from public.profile_updates pu
      where pu.id = profile_update_likes.update_id
        and public.viewer_can_read_profile_surface(pu.user_id)
    )
  );

create policy "Users insert own pulse likes when update readable"
  on public.profile_update_likes for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profile_updates pu
      where pu.id = update_id
        and public.viewer_can_read_profile_surface(pu.user_id)
    )
  );

create policy "Users delete own pulse likes"
  on public.profile_update_likes for delete
  using ((select auth.uid()) = user_id);

comment on policy "Pulse likes viewable with profile surface" on public.profile_update_likes is
  'Likes inherit parent profile_update visibility — strangers cannot enumerate engagement on private profiles.';

-- ---------------------------------------------------------------------------
-- 4. profile_update_comments — gate reads and inserts through parent update
-- ---------------------------------------------------------------------------
drop policy if exists "Pulse comments are viewable by everyone" on public.profile_update_comments;
drop policy if exists "Users can insert own pulse comments" on public.profile_update_comments;

create policy "Pulse comments viewable with profile surface"
  on public.profile_update_comments for select
  using (
    exists (
      select 1
      from public.profile_updates pu
      where pu.id = profile_update_comments.update_id
        and public.viewer_can_read_profile_surface(pu.user_id)
    )
  );

create policy "Users insert own pulse comments when update readable"
  on public.profile_update_comments for insert
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.profile_updates pu
      where pu.id = update_id
        and public.viewer_can_read_profile_surface(pu.user_id)
    )
  );

comment on policy "Pulse comments viewable with profile surface" on public.profile_update_comments is
  'Comments inherit parent profile_update visibility — private My Pulse threads are not world-readable.';

-- UPDATE/DELETE policies from 054/057 unchanged.

-- ---------------------------------------------------------------------------
-- 5. Harden toggle_profile_update_like RPC
-- ---------------------------------------------------------------------------
create or replace function public.toggle_profile_update_like(p_update_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select pu.user_id into v_owner
    from public.profile_updates pu
   where pu.id = p_update_id;

  if v_owner is null then
    raise exception 'update not found';
  end if;

  if not public.viewer_can_read_profile_surface(v_owner) then
    raise exception 'not allowed';
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
