-- Feed stitch / combine-clips: persist which post supplied Part 1 / A-roll (attribution + analytics).

alter table public.posts
  add column if not exists stitch_source_post_id uuid references public.posts(id) on delete set null;

create index if not exists posts_stitch_source_post_id_idx
  on public.posts (stitch_source_post_id)
  where stitch_source_post_id is not null;

comment on column public.posts.stitch_source_post_id is
  'When set, this post used another post video as the primary clip in a multi-part stitch / B-roll combine flow.';
