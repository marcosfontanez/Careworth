-- Align ranked feed tag matching with get_for_you_post_ids / 021:
-- `'forYou' = any(feed_type_eligible)` misses legacy "For You" strings.

create or replace function public.get_ranked_feed(
  viewer_id uuid,
  feed_limit int default 50,
  cursor_ts timestamptz default null
)
returns table(
  post_id uuid,
  score float
) as $$
declare
  v_role text;
  v_specialty text;
  v_state text;
begin
  select p.role, p.specialty, p.state
  into v_role, v_specialty, v_state
  from public.profiles p
  where p.id = viewer_id;

  return query
  select
    posts.id as post_id,
    (
      coalesce(posts.ranking_score, 0) * 10
      + (
        (posts.like_count + posts.comment_count * 2 + posts.share_count * 3)::float
        / greatest(extract(epoch from (now() - posts.created_at)) / 3600, 1)
      ) * 5
      + 100 * exp(-0.058 * extract(epoch from (now() - posts.created_at)) / 3600)
      + ln(greatest(posts.view_count, 1) + 1) * 3
      + case when posts.role_context = v_role then 15 else 0 end
      + case when posts.specialty_context = v_specialty then 20 else 0 end
      + case when posts.location_context = v_state then 10 else 0 end
      + case when posts.type = 'video' then 8 else 0 end
      + case when creator.is_verified then 5 else 0 end
    )::float as score
  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  where
    exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    and (
      posts.privacy_mode = 'public'
      or posts.creator_id = viewer_id
    )
    and (cursor_ts is null or posts.created_at < cursor_ts)
  order by score desc
  limit feed_limit;
end;
$$ language plpgsql security definer;

-- Feed RPCs were added without GRANT EXECUTE; the anon key used by the app often cannot
-- call them → PostgREST returns permission errors and the ranked path never returns rows.
grant execute on function public.get_ranked_feed(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed(uuid, int, timestamptz) to anon;

grant execute on function public.get_top_today(int) to authenticated;
grant execute on function public.get_top_today(int) to anon;
