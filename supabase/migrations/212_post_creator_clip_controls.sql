-- ============================================================================
-- 212: Creator clip/remix/download controls on posts + profile defaults.
-- ============================================================================

alter table public.profiles
  add column if not exists default_allow_viewer_clips boolean not null default true,
  add column if not exists default_allow_remix boolean not null default true,
  add column if not exists default_allow_clip_downloads boolean not null default false;

comment on column public.profiles.default_allow_viewer_clips is
  'Default for new public video posts: let others create attributed feed clips.';
comment on column public.profiles.default_allow_remix is
  'Default for new public video posts: allow duet/stitch/sound remix.';
comment on column public.profiles.default_allow_clip_downloads is
  'Default for new public video posts: let others download video outside PulseVerse.';

alter table public.posts
  add column if not exists allow_viewer_clips boolean not null default true,
  add column if not exists allow_remix boolean not null default true,
  add column if not exists allow_clip_downloads boolean not null default false;

comment on column public.posts.allow_viewer_clips is
  'When false, non-owners cannot open Feed clip composer for this post. Owner always can clip own video.';
comment on column public.posts.allow_remix is
  'When false, non-owners cannot duet/stitch/use sound from this post.';
comment on column public.posts.allow_clip_downloads is
  'When false, non-owners cannot download this post media. Owner always can download own post.';

-- Preserve effective behavior for existing rows (public = on, followers/private/alias/anonymous = off).
update public.posts
set
  allow_viewer_clips = (
    privacy_mode = 'public' and not coalesce(is_anonymous, false)
  ),
  allow_remix = (
    privacy_mode = 'public' and not coalesce(is_anonymous, false)
  ),
  allow_clip_downloads = false
where true;
