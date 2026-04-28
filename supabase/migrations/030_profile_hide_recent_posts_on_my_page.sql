-- Owner can hide the horizontal "recent posts" strip on their own My Page tab only; visitors still see public content.
alter table public.profiles
  add column if not exists hide_recent_posts_on_my_page boolean not null default false;

comment on column public.profiles.hide_recent_posts_on_my_page is
  'When true, the signed-in owner does not see the recent-posts carousel on the My Page tab; profile visitors still see recent public posts.';
