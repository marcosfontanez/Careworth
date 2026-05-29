-- Sprint 2D (blocker cleanup): Confessions circle thread/reply DB masking,
-- thread soft-delete, per-circle moderator flag, reply-read safety.

-- ---------------------------------------------------------------------------
-- 1. Per-circle moderator flag
-- ---------------------------------------------------------------------------
alter table public.community_members
  add column if not exists is_moderator boolean not null default false;

comment on column public.community_members.is_moderator is
  'When true, user may soft-delete threads in this community (plus global role_admin).';

create index if not exists idx_community_members_moderators
  on public.community_members (community_id)
  where is_moderator = true;

create or replace function public.user_can_moderate_community(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user_id is null or p_community_id is null then false
    when exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and coalesce(p.role_admin, false) = true
    ) then true
    else exists (
      select 1
      from public.community_members cm
      where cm.community_id = p_community_id
        and cm.user_id = p_user_id
        and cm.is_moderator = true
    )
  end;
$$;

comment on function public.user_can_moderate_community(uuid, uuid) is
  'Global staff (role_admin) or community_members.is_moderator may moderate a circle.';

-- ---------------------------------------------------------------------------
-- 2. Circle thread soft-delete
-- ---------------------------------------------------------------------------
alter table public.circle_threads
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

comment on column public.circle_threads.deleted_at is
  'Soft-delete timestamp; hidden from public lists when set.';
comment on column public.circle_threads.deleted_by is
  'Moderator/staff who removed the thread (author hard-delete still allowed).';

create index if not exists idx_circle_threads_active
  on public.circle_threads (community_id, created_at desc)
  where deleted_at is null;

-- Staff / per-circle moderators may soft-delete (update deleted_at)
drop policy if exists "Staff can moderate circle threads" on public.circle_threads;
create policy "Staff can moderate circle threads"
  on public.circle_threads for update
  using (public.user_can_moderate_community(community_id, (select auth.uid())))
  with check (public.user_can_moderate_community(community_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- 3. Viewer-safe circle author masking (Confessions pseudonymity at DB layer)
-- ---------------------------------------------------------------------------
create or replace function public.viewer_safe_circle_author_id(
  p_author_id uuid,
  p_community_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.community_is_confessions(p_community_id) then p_author_id
    when (select auth.uid()) is not distinct from p_author_id then p_author_id
    when exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.role_admin, false) = true
    ) then p_author_id
    else '00000000-0000-0000-0000-000000000001'::uuid
  end;
$$;

comment on function public.viewer_safe_circle_author_id(uuid, uuid) is
  'Masks circle thread/reply author_id in Confessions unless viewer is author or staff.';

drop view if exists public.circle_threads_viewer_safe;

create view public.circle_threads_viewer_safe
with (security_invoker = true) as
select
  t.id,
  t.community_id,
  public.viewer_safe_circle_author_id(t.author_id, t.community_id) as author_id,
  t.kind,
  t.title,
  t.body,
  t.media_thumb_url,
  t.linked_post_id,
  t.created_at,
  t.updated_at,
  t.reply_count,
  t.reaction_count,
  t.share_count,
  t.deleted_at,
  t.deleted_by
from public.circle_threads t;

comment on view public.circle_threads_viewer_safe is
  'Circle thread reads with Confessions author masking; includes soft-delete columns for staff paths.';

grant select on public.circle_threads_viewer_safe to anon, authenticated, service_role;

drop view if exists public.circle_replies_viewer_safe;

create view public.circle_replies_viewer_safe
with (security_invoker = true) as
select
  cr.id,
  cr.thread_id,
  public.viewer_safe_circle_author_id(cr.author_id, ct.community_id) as author_id,
  cr.body,
  cr.created_at,
  cr.reaction_count
from public.circle_replies cr
join public.circle_threads ct on ct.id = cr.thread_id;

comment on view public.circle_replies_viewer_safe is
  'Circle reply reads with Confessions author masking via parent thread community.';

grant select on public.circle_replies_viewer_safe to anon, authenticated, service_role;
