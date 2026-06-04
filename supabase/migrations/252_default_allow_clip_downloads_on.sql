-- 252: Default allow downloads ON for new public videos; creators opt out per post or in Settings.

alter table public.profiles
  alter column default_allow_clip_downloads set default true;

update public.profiles
  set default_allow_clip_downloads = true
  where default_allow_clip_downloads = false;

alter table public.posts
  alter column allow_clip_downloads set default true;

comment on column public.profiles.default_allow_clip_downloads is
  'Default allow_clip_downloads for new public video posts (opt out in Settings or per post).';

comment on column public.posts.allow_clip_downloads is
  'When true, non-owners may download this video; default ON for new uploads.';
