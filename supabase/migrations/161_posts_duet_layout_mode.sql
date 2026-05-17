-- Persist in-feed duet parent chrome (camera "Side-by-side" vs "PiP") on the child post.

alter table public.posts add column if not exists duet_layout_mode text;

alter table public.posts drop constraint if exists posts_duet_layout_mode_chk;

alter table public.posts
  add constraint posts_duet_layout_mode_chk
  check (
    duet_layout_mode is null
    or duet_layout_mode in ('strip', 'floating')
  );

comment on column public.posts.duet_layout_mode is
  'Duet child post: parent reference layout in feed — strip (side-by-side) or floating (PiP). Null treated as strip in clients.';
