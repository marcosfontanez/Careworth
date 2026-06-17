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
