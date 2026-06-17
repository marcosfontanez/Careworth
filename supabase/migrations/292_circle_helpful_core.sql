-- ============================================================
-- Circle reply helpful reactions + hardening + notifications
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 267_circle_reply_helpful_and_activity_badges.sql ----------
-- Circle reply Helpful reactions + joined-room activity badge RPC.

-- ---------------------------------------------------------------------------
-- 1. helpful_count on circle_replies
-- ---------------------------------------------------------------------------
alter table public.circle_replies
  add column if not exists helpful_count int not null default 0;

comment on column public.circle_replies.helpful_count is
  'Denormalized count of Helpful reactions (circle_reply_reactions).';

-- ---------------------------------------------------------------------------
-- 2. circle_reply_reactions
-- ---------------------------------------------------------------------------
create table if not exists public.circle_reply_reactions (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null references public.circle_replies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'helpful',
  created_at timestamptz not null default now(),
  unique (reply_id, user_id, reaction_type),
  constraint circle_reply_reactions_type_ck check (reaction_type in ('helpful'))
);

create index if not exists idx_circle_reply_reactions_reply
  on public.circle_reply_reactions (reply_id);

alter table public.circle_reply_reactions enable row level security;

create or replace function public.user_can_react_to_circle_reply(p_reply_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_replies cr
    join public.circle_threads t on t.id = cr.thread_id
    join public.community_members cm on cm.community_id = t.community_id
    where cr.id = p_reply_id
      and cr.moderation_status = 'active'
      and t.moderation_status = 'active'
      and t.deleted_at is null
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function public.sync_circle_reply_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' and new.reaction_type = 'helpful' then
      update public.circle_replies
      set helpful_count = helpful_count + 1
      where id = new.reply_id;
    elsif tg_op = 'DELETE' and old.reaction_type = 'helpful' then
      update public.circle_replies
      set helpful_count = greatest(0, helpful_count - 1)
      where id = old.reply_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_circle_reply_helpful_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('reply_id', coalesce(new.reply_id, old.reply_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_circle_reply_reactions_sync_helpful on public.circle_reply_reactions;
create trigger trg_circle_reply_reactions_sync_helpful
  after insert or delete on public.circle_reply_reactions
  for each row execute function public.sync_circle_reply_helpful_count();

drop policy if exists "Users can view circle reply reactions" on public.circle_reply_reactions;
create policy "Users can view circle reply reactions"
  on public.circle_reply_reactions for select
  using (true);

drop policy if exists "Members can mark replies helpful" on public.circle_reply_reactions;
create policy "Members can mark replies helpful"
  on public.circle_reply_reactions for insert
  with check (
    (select auth.uid()) = user_id
    and reaction_type = 'helpful'
    and public.user_can_react_to_circle_reply(reply_id)
  );

drop policy if exists "Users can remove own circle reply reactions" on public.circle_reply_reactions;
create policy "Users can remove own circle reply reactions"
  on public.circle_reply_reactions for delete
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.circle_reply_reactions to authenticated;
grant all on public.circle_reply_reactions to service_role;

-- ---------------------------------------------------------------------------
-- 3. Refresh viewer-safe replies (include helpful_count)
-- ---------------------------------------------------------------------------
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
  cr.helpful_count,
  cr.moderation_status,
  cr.moderated_by,
  cr.moderated_at,
  cr.moderation_reason
from public.circle_replies cr
join public.circle_threads ct on ct.id = cr.thread_id;

grant select on public.circle_replies_viewer_safe to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Joined-circle activity badges (single RPC, no N+1)
-- ---------------------------------------------------------------------------
create or replace function public.get_joined_circle_activity_badges(
  p_community_ids uuid[],
  p_since jsonb default '{}'::jsonb
)
returns table (
  community_id uuid,
  new_wall_posts bigint,
  new_threads bigint,
  new_replies_on_yours bigint,
  unanswered_questions bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cid as community_id,
    coalesce((
      select count(*)::bigint
      from public.posts p
      where p.communities @> array[cid::text]
        and p.privacy_mode = 'public'
        and (p_since ? cid::text)
        and p.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_wall_posts,
    coalesce((
      select count(*)::bigint
      from public.circle_threads t
      where t.community_id = cid
        and t.moderation_status = 'active'
        and t.deleted_at is null
        and (p_since ? cid::text)
        and t.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_threads,
    coalesce((
      select count(*)::bigint
      from public.circle_replies cr
      join public.circle_threads t on t.id = cr.thread_id
      where t.community_id = cid
        and t.author_id = (select auth.uid())
        and cr.author_id <> (select auth.uid())
        and cr.moderation_status = 'active'
        and t.moderation_status = 'active'
        and t.deleted_at is null
        and (p_since ? cid::text)
        and cr.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_replies_on_yours,
    coalesce((
      select count(*)::bigint
      from public.circle_threads t
      where t.community_id = cid
        and t.kind = 'question'
        and t.reply_count = 0
        and t.moderation_status = 'active'
        and t.deleted_at is null
    ), 0) as unanswered_questions
  from unnest(p_community_ids) as cid;
$$;

revoke all on function public.get_joined_circle_activity_badges(uuid[], jsonb) from public;
grant execute on function public.get_joined_circle_activity_badges(uuid[], jsonb) to authenticated;
grant execute on function public.get_joined_circle_activity_badges(uuid[], jsonb) to service_role;


-- ---------- source: 268_circle_reply_helpful_hardening.sql ----------
-- Block-aware Helpful eligibility (mirrors reply composer block guard).
create or replace function public.user_can_react_to_circle_reply(p_reply_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_replies cr
    join public.circle_threads t on t.id = cr.thread_id
    join public.community_members cm on cm.community_id = t.community_id
    where cr.id = p_reply_id
      and cr.moderation_status = 'active'
      and t.moderation_status = 'active'
      and t.deleted_at is null
      and cm.user_id = (select auth.uid())
      and not exists (
        select 1
        from public.blocked_users bu
        where (
          bu.blocker_id = (select auth.uid()) and bu.blocked_id = cr.author_id
        ) or (
          bu.blocker_id = cr.author_id and bu.blocked_id = (select auth.uid())
        )
      )
  );
$$;

-- Only return badge rows for communities the caller has joined.
create or replace function public.get_joined_circle_activity_badges(
  p_community_ids uuid[],
  p_since jsonb default '{}'::jsonb
)
returns table (
  community_id uuid,
  new_wall_posts bigint,
  new_threads bigint,
  new_replies_on_yours bigint,
  unanswered_questions bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cid as community_id,
    coalesce((
      select count(*)::bigint
      from public.posts p
      where p.communities @> array[cid::text]
        and p.privacy_mode = 'public'
        and (p_since ? cid::text)
        and p.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_wall_posts,
    coalesce((
      select count(*)::bigint
      from public.circle_threads t
      where t.community_id = cid
        and t.moderation_status = 'active'
        and t.deleted_at is null
        and (p_since ? cid::text)
        and t.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_threads,
    coalesce((
      select count(*)::bigint
      from public.circle_replies cr
      join public.circle_threads t on t.id = cr.thread_id
      where t.community_id = cid
        and t.author_id = (select auth.uid())
        and cr.author_id <> (select auth.uid())
        and cr.moderation_status = 'active'
        and t.moderation_status = 'active'
        and t.deleted_at is null
        and (p_since ? cid::text)
        and cr.created_at > (p_since ->> cid::text)::timestamptz
    ), 0) as new_replies_on_yours,
    coalesce((
      select count(*)::bigint
      from public.circle_threads t
      where t.community_id = cid
        and t.kind = 'question'
        and t.reply_count = 0
        and t.moderation_status = 'active'
        and t.deleted_at is null
    ), 0) as unanswered_questions
  from unnest(p_community_ids) as cid
  where exists (
    select 1
    from public.community_members cm
    where cm.community_id = cid
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.get_joined_circle_activity_badges(uuid[], jsonb) from public;
grant execute on function public.get_joined_circle_activity_badges(uuid[], jsonb) to authenticated;
grant execute on function public.get_joined_circle_activity_badges(uuid[], jsonb) to service_role;

-- Helpful mutations require authenticated session (RLS still applies).
revoke insert, delete, update on public.circle_reply_reactions from anon;
revoke insert, delete, update on public.circle_reply_reactions from public;
grant select, insert, delete on public.circle_reply_reactions to authenticated;


-- ---------- source: 270_circle_reply_helpful_notifications.sql ----------
-- Notify reply authors when someone marks their Circle reply Helpful (insert-only, no spam on remove).

create or replace function public.notify_on_circle_reply_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reply_author uuid;
  v_thread_id uuid;
  v_community_id uuid;
  v_reply_status text;
  v_thread_status text;
  v_thread_deleted timestamptz;
  v_redact_actor boolean;
  v_actor_id uuid;
  v_actor_name text;
  v_message text;
begin
  if tg_op <> 'INSERT' or new.reaction_type <> 'helpful' then
    return new;
  end if;

  begin
    select
      cr.author_id,
      cr.thread_id,
      t.community_id,
      cr.moderation_status,
      t.moderation_status,
      t.deleted_at
    into
      v_reply_author,
      v_thread_id,
      v_community_id,
      v_reply_status,
      v_thread_status,
      v_thread_deleted
    from public.circle_replies cr
    join public.circle_threads t on t.id = cr.thread_id
    where cr.id = new.reply_id;

    if v_reply_author is null or v_community_id is null then
      return new;
    end if;

    if v_reply_author = new.user_id then
      return new;
    end if;

    if coalesce(v_reply_status, 'active') <> 'active' then
      return new;
    end if;

    if coalesce(v_thread_status, 'active') <> 'active' then
      return new;
    end if;

    if v_thread_deleted is not null then
      return new;
    end if;

    if exists (
      select 1
      from public.blocked_users bu
      where (
        bu.blocker_id = new.user_id and bu.blocked_id = v_reply_author
      ) or (
        bu.blocker_id = v_reply_author and bu.blocked_id = new.user_id
      )
    ) then
      return new;
    end if;

    v_redact_actor := public.community_is_confessions(v_community_id);
    v_actor_id := case when v_redact_actor then null else new.user_id end;

    if v_redact_actor then
      v_message := 'Someone found your reply helpful.';
    else
      select coalesce(
        nullif(trim(p.display_name), ''),
        nullif(trim(p.username), ''),
        'Someone'
      )
        into v_actor_name
      from public.profiles p
      where p.id = new.user_id;

      v_message := coalesce(v_actor_name, 'Someone') || ' found your reply helpful.';
    end if;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
    values (
      v_reply_author,
      v_actor_id,
      'circle_reply_helpful',
      v_message,
      v_thread_id::text,
      false,
      v_community_id
    );
  exception when others then
    perform public.log_trigger_error(
      'notify_on_circle_reply_helpful',
      tg_op,
      tg_table_name,
      sqlstate,
      sqlerrm,
      jsonb_build_object('reply_id', new.reply_id, 'reactor_id', new.user_id)
    );
  end;

  return new;
end;
$$;

drop trigger if exists trg_circle_reply_reactions_notify_helpful on public.circle_reply_reactions;
create trigger trg_circle_reply_reactions_notify_helpful
  after insert on public.circle_reply_reactions
  for each row execute function public.notify_on_circle_reply_helpful();

comment on function public.notify_on_circle_reply_helpful() is
  'Fires once per new Helpful reaction; skips self, blocks, inactive/deleted content, and Confessions identity.';

revoke all on function public.notify_on_circle_reply_helpful() from public;


