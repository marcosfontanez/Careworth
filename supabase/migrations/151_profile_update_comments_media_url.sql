-- My Pulse comments: optional photo attachment (parity with public.comments.media_url).

alter table public.profile_update_comments
  drop constraint if exists profile_update_comments_content_check;

alter table public.profile_update_comments
  add column if not exists media_url text;

comment on column public.profile_update_comments.media_url is
  'Optional image on a My Pulse profile_update comment; public URL (typically post-media bucket).';

-- Allow photo-only comments; cap body length to match app COMMENT_MAX_LENGTH (300).
alter table public.profile_update_comments
  add constraint profile_update_comments_content_or_media_ck
  check (
    char_length(content) <= 300
    and (
      char_length(trim(content)) > 0
      or (media_url is not null and char_length(trim(media_url)) > 0)
    )
  );
