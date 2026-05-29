-- ============================================================================
-- 210: Feed-native clip attribution — source post + trim window on posts.
-- ============================================================================

alter table public.posts
  add column if not exists source_post_id uuid references public.posts(id) on delete set null,
  add column if not exists clip_start_seconds numeric,
  add column if not exists clip_end_seconds numeric;

comment on column public.posts.source_post_id is
  'When set, this post is a feed clip trimmed from another post (Feed Clip Composer).';

comment on column public.posts.clip_start_seconds is
  'Inclusive trim start (seconds) relative to source_post_id media.';

comment on column public.posts.clip_end_seconds is
  'Exclusive trim end (seconds) relative to source_post_id media.';

create index if not exists posts_source_post_id_idx
  on public.posts (source_post_id)
  where source_post_id is not null;
