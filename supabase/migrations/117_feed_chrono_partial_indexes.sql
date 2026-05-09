-- Feed list performance: match WHERE + ORDER BY shapes from `postsService`
-- (`fetchForYouPostsChronological`, `getFeed` / `getFeedContinuation`, `get_for_you_post_ids`).
--
-- Partial btree indexes keep working sets small and avoid seq scans as `posts` grows.
-- Ranked RPCs (`get_ranked_feed*`) order by score, not `created_at`; they still benefit
-- indirectly when the planner uses these for subqueries or when SQL evolves.
--
-- Existing: `idx_posts_feed_type` (GIN on feed_type_eligible), `idx_posts_live_created_at_desc` (110),
-- `idx_posts_creator_created` (062). These add feed-token + live (+ public) predicates aligned with
-- Supabase/Postgres guidance: index filter columns that appear together in hot queries.

create index if not exists idx_posts_foryou_live_created_at_desc
  on public.posts (created_at desc)
  where coalesce(scheduled_status, 'live') = 'live'
    and feed_type_eligible @> array['forYou']::text[];

create index if not exists idx_posts_following_live_created_at_desc
  on public.posts (created_at desc)
  where coalesce(scheduled_status, 'live') = 'live'
    and feed_type_eligible @> array['following']::text[];

-- Top Today REST fallback (`privacy_mode = public`, last 24h) and other public-surface
-- chronological scans without requiring a feed_type token match.
create index if not exists idx_posts_public_live_created_at_desc
  on public.posts (created_at desc)
  where coalesce(scheduled_status, 'live') = 'live'
    and privacy_mode = 'public';

comment on index public.idx_posts_foryou_live_created_at_desc is
  'Chronological For You slices (RPC + REST + infinite scroll); live posts only.';
comment on index public.idx_posts_following_live_created_at_desc is
  'Chronological Following tab + continuation; live posts only.';
comment on index public.idx_posts_public_live_created_at_desc is
  'Public live posts by time (e.g. Top Today windowed fallback, discovery shells).';

analyze public.posts;
