-- Speed up chronological feed paths that filter to live posts and order by `created_at` desc
-- (`get_for_you_post_ids`, continuation queries, top-today windows). Partial index stays small.

create index if not exists idx_posts_live_created_at_desc
  on public.posts (created_at desc)
  where coalesce(scheduled_status, 'live') = 'live';

analyze public.posts;
