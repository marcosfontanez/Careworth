-- Hardening: only aggregate exclusions for auth.uid() === viewer_uuid.
-- RLS already limits visible rows, but this avoids relying on RLS alone for API shape.

create or replace function public.get_feed_exclusions(viewer_uuid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if viewer_uuid is null or viewer_uuid is distinct from auth.uid() then
    return jsonb_build_object(
      'hidden_post_ids', '[]'::jsonb,
      'hidden_creator_ids', '[]'::jsonb
    );
  end if;

  return (
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
    )
  );
end;
$$;
