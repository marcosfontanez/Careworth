-- ============================================================================
-- 213: Preserve original creator on feed clips when source post is deleted.
-- ============================================================================

alter table public.posts
  add column if not exists source_creator_id uuid references public.profiles(id) on delete set null;

comment on column public.posts.source_creator_id is
  'Original creator for feed clips; kept when source_post_id is cleared on source delete.';

update public.posts p
set source_creator_id = s.creator_id
from public.posts s
where p.source_post_id = s.id
  and p.source_creator_id is null;

create index if not exists posts_source_creator_id_idx
  on public.posts (source_creator_id)
  where source_creator_id is not null;
