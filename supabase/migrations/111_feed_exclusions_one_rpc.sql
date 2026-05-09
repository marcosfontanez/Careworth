-- One round-trip for feed hide / block signals (client previously did 2 REST calls).
-- security invoker: respects RLS on feed_user_actions + blocked_users.

create or replace function public.get_feed_exclusions(viewer_uuid uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'hidden_post_ids',
    coalesce(
      (
        select jsonb_agg(x.post_id)
        from (
          select distinct f.post_id
          from public.feed_user_actions f
          where f.user_id = viewer_uuid
            and f.action = 'not_interested'
            and f.post_id is not null
        ) x
      ),
      '[]'::jsonb
    ),
    'hidden_creator_ids',
    coalesce(
      (
        select jsonb_agg(y.creator_id)
        from (
          select distinct bu.blocked_id as creator_id
          from public.blocked_users bu
          where bu.blocker_id = viewer_uuid
          union
          select distinct bu.blocker_id as creator_id
          from public.blocked_users bu
          where bu.blocked_id = viewer_uuid
          union
          select distinct f.creator_id
          from public.feed_user_actions f
          where f.user_id = viewer_uuid
            and f.action = 'hide_creator'
            and f.creator_id is not null
        ) y
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.get_feed_exclusions(uuid) to authenticated;

-- Speed symmetric block lookups (previously only (blocker_id, blocked_id) composite helped blocker-led probes).
create index if not exists idx_blocked_users_blocked_id
  on public.blocked_users (blocked_id);

analyze public.blocked_users;
