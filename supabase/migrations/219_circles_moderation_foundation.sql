-- Sprint 2D: Circle moderation foundation — status fields, circle_moderators,
-- reply moderation RLS, viewer-safe view updates. Builds on migration 218.

-- ---------------------------------------------------------------------------
-- 1. Moderation status on circle_threads
-- ---------------------------------------------------------------------------
alter table public.circle_threads
  add column if not exists moderation_status text not null default 'active',
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'circle_threads_moderation_status_ck'
      and conrelid = 'public.circle_threads'::regclass
  ) then
    alter table public.circle_threads
      add constraint circle_threads_moderation_status_ck
      check (moderation_status in ('active', 'hidden', 'removed', 'pending_review'));
  end if;
end $$;

-- Backfill from legacy deleted_at (migration 218)
update public.circle_threads
set
  moderation_status = 'removed',
  moderated_by = coalesce(moderated_by, deleted_by),
  moderated_at = coalesce(moderated_at, deleted_at)
where deleted_at is not null
  and moderation_status = 'active';

create index if not exists idx_circle_threads_moderation_list
  on public.circle_threads (community_id, moderation_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Moderation status on circle_replies
-- ---------------------------------------------------------------------------
alter table public.circle_replies
  add column if not exists moderation_status text not null default 'active',
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'circle_replies_moderation_status_ck'
      and conrelid = 'public.circle_replies'::regclass
  ) then
    alter table public.circle_replies
      add constraint circle_replies_moderation_status_ck
      check (moderation_status in ('active', 'hidden', 'removed', 'pending_review'));
  end if;
end $$;

create index if not exists idx_circle_replies_moderation_list
  on public.circle_replies (thread_id, moderation_status, created_at asc);

-- ---------------------------------------------------------------------------
-- 3. Per-circle moderators (preferred over community_members.is_moderator alone)
-- ---------------------------------------------------------------------------
create table if not exists public.circle_moderators (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'moderator',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'circle_moderators_role_ck'
      and conrelid = 'public.circle_moderators'::regclass
  ) then
    alter table public.circle_moderators
      add constraint circle_moderators_role_ck
      check (role in ('moderator', 'lead_moderator'));
  end if;
end $$;

create index if not exists idx_circle_moderators_community_user
  on public.circle_moderators (community_id, user_id);

-- Migrate legacy community_members.is_moderator rows
insert into public.circle_moderators (community_id, user_id, role, created_at)
select cm.community_id, cm.user_id, 'moderator', coalesce(cm.joined_at, now())
from public.community_members cm
where coalesce(cm.is_moderator, false) = true
on conflict (community_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Moderation helper functions (before RLS policies that reference them)
-- ---------------------------------------------------------------------------
create or replace function public.is_circle_moderator(
  p_community_id uuid,
  p_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p_user_id, (select auth.uid())) is null or p_community_id is null then false
    else exists (
      select 1
      from public.circle_moderators cm
      where cm.community_id = p_community_id
        and cm.user_id = coalesce(p_user_id, (select auth.uid()))
    )
    or exists (
      select 1
      from public.community_members mem
      where mem.community_id = p_community_id
        and mem.user_id = coalesce(p_user_id, (select auth.uid()))
        and coalesce(mem.is_moderator, false) = true
    )
  end;
$$;

create or replace function public.can_moderate_circle_for_user(
  p_community_id uuid,
  p_user_id uuid
)
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
    else public.is_circle_moderator(p_community_id, p_user_id)
  end;
$$;

create or replace function public.can_moderate_circle(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_moderate_circle_for_user(p_community_id, (select auth.uid()));
$$;

comment on function public.can_moderate_circle(uuid) is
  'True when auth user is global staff or a moderator for p_community_id.';

create or replace function public.user_can_moderate_community(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_moderate_circle_for_user(p_community_id, p_user_id);
$$;

grant execute on function public.can_moderate_circle(uuid) to authenticated;
grant execute on function public.is_circle_moderator(uuid, uuid) to authenticated;

alter table public.circle_moderators enable row level security;

drop policy if exists "Admins manage circle moderators" on public.circle_moderators;
create policy "Admins manage circle moderators"
  on public.circle_moderators for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

drop policy if exists "Circle moderators can view mod roster" on public.circle_moderators;
create policy "Circle moderators can view mod roster"
  on public.circle_moderators for select
  using (
    public.can_moderate_circle_for_user(community_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 5. Reply + thread moderation RLS
-- ---------------------------------------------------------------------------
drop policy if exists "Staff can moderate circle replies" on public.circle_replies;
create policy "Staff can moderate circle replies"
  on public.circle_replies for update
  using (
    exists (
      select 1
      from public.circle_threads ct
      where ct.id = thread_id
        and public.can_moderate_circle_for_user(ct.community_id, (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1
      from public.circle_threads ct
      where ct.id = thread_id
        and public.can_moderate_circle_for_user(ct.community_id, (select auth.uid()))
    )
  );

-- Thread policy uses unified helper (replace migration 218 policy)
drop policy if exists "Staff can moderate circle threads" on public.circle_threads;
create policy "Staff can moderate circle threads"
  on public.circle_threads for update
  using (public.can_moderate_circle_for_user(community_id, (select auth.uid())))
  with check (public.can_moderate_circle_for_user(community_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- 6. Refresh viewer-safe views (include moderation columns)
-- ---------------------------------------------------------------------------
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
  t.deleted_by,
  t.moderation_status,
  t.moderated_by,
  t.moderated_at,
  t.moderation_reason
from public.circle_threads t;

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
  cr.reaction_count,
  cr.moderation_status,
  cr.moderated_by,
  cr.moderated_at,
  cr.moderation_reason
from public.circle_replies cr
join public.circle_threads ct on ct.id = cr.thread_id;

grant select on public.circle_replies_viewer_safe to anon, authenticated, service_role;
