-- Align feed RPCs with client `postAppearsInMainFeeds`:
-- hide posts still undergoing server-side media concat (`media_processing_status` queued|running).
-- Also align ranked feeds with For You chronological RPC: only `scheduled_status = live` surfaces.

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
    and coalesce(p.scheduled_status, 'live') = 'live'
    and (
      p.media_processing_status is null
      or lower(trim(p.media_processing_status)) not in ('queued', 'running')
    )
  order by p.created_at desc
  limit least(greatest(result_limit, 1), 200);
$$;

grant execute on function public.get_for_you_post_ids(uuid, int) to authenticated;
grant execute on function public.get_for_you_post_ids(uuid, int) to anon;

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
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running')
    )
    and (cursor_ts is null or posts.created_at < cursor_ts)
  order by score desc
  limit feed_limit;
end;
$$ language plpgsql security definer;

grant execute on function public.get_ranked_feed(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed(uuid, int, timestamptz) to anon;

create or replace function public.get_ranked_feed_v2(
  viewer_id   uuid,
  feed_limit  int          default 50,
  cursor_ts   timestamptz  default null
)
returns table (
  post_id uuid,
  score   float
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid        := viewer_id;
  v_feed_limit int        := feed_limit;
  v_cursor_ts  timestamptz := cursor_ts;

  v_role      text;
  v_specialty text;
  v_state     text;
begin
  select pr.role, pr.specialty, pr.state
  into v_role, v_specialty, v_state
  from public.profiles pr
  where pr.id = v_viewer_id;

  return query
  with
    followed_creators as (
      select following_id as creator_id
      from public.follows
      where follower_id = v_viewer_id
    ),

    liked_creators as (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),

    saved_creators as (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = v_viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),

    viewer_top_hashtags as (
      select tag, count(*)::int as ct
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
        and length(trim(tag)) > 0
      group by tag
      order by ct desc
      limit 5
    ),

    creator_completion as (
      select
        p.creator_id,
        sum(case when pv.view_duration_ms > 5000 then 1 else 0 end)::float
          / nullif(count(*), 0)::float as rate
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.created_at >= now() - interval '60 days'
      group by p.creator_id
    ),

    skipped_creators as (
      select distinct p.creator_id
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
    )

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
      + case when posts.role_context      = v_role      then 15 else 0 end
      + case when posts.specialty_context = v_specialty then 20 else 0 end
      + case when posts.location_context  = v_state     then 10 else 0 end
      + case when posts.type = 'video'                  then  8 else 0 end
      + case when creator.is_verified                   then  5 else 0 end

      + case
          when exists (
            select 1 from followed_creators fc where fc.creator_id = posts.creator_id
          ) then 30 else 0
        end
      + case
          when exists (
            select 1 from liked_creators lc where lc.creator_id = posts.creator_id
          ) then 20 else 0
        end
      + case
          when exists (
            select 1 from saved_creators sc where sc.creator_id = posts.creator_id
          ) then 12 else 0
        end
      + (
          select count(*)::int * 8
          from viewer_top_hashtags vth
          where vth.tag = any (coalesce(posts.hashtags, '{}'::text[]))
        )
      + coalesce(
          (
            select cc.rate * 25
            from creator_completion cc
            where cc.creator_id = posts.creator_id
          ),
          0
        )
      + case
          when exists (
            select 1 from skipped_creators sk where sk.creator_id = posts.creator_id
          ) then -15 else 0
        end
      + case
          when posts.created_at >= now() - interval '30 minutes' then 40 else 0
        end
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
      or posts.creator_id = v_viewer_id
    )
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running')
    )
    and (v_cursor_ts is null or posts.created_at < v_cursor_ts)
  order by score desc
  limit v_feed_limit;
end;
$$;

grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to authenticated;
grant execute on function public.get_ranked_feed_v2(uuid, int, timestamptz) to anon;
