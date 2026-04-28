-- Reliable For You filtering in SQL (avoids PostgREST edge cases chaining .contains() + .or()).
-- Matches feed_type_eligible tags case-insensitively for "forYou" / "For You" typos.

create or replace function public.get_for_you_post_ids(
  viewer_uuid uuid,
  result_limit int default 50
)
returns table(id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id
  from public.posts p
  where
    exists (
      select 1
      from unnest(coalesce(p.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    and (
      p.privacy_mode = 'public'
      or p.creator_id = viewer_uuid
    )
  order by p.created_at desc
  limit least(greatest(result_limit, 1), 200);
$$;

grant execute on function public.get_for_you_post_ids(uuid, int) to authenticated;
grant execute on function public.get_for_you_post_ids(uuid, int) to anon;
