-- Speed up Circle wall queries: postsService.getByCommunity uses
-- `.contains('communities', [communityId])` → SQL `communities @> ARRAY[...]`.
-- Without a GIN index PostgreSQL tends to seq-scan `posts` as the table grows.

create index if not exists idx_posts_communities_gin
  on public.posts using gin (communities);

comment on index public.idx_posts_communities_gin is
  'Supports containment filters on posts.communities (circle wall loads).';
