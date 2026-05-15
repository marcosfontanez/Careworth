-- Persist the on-video sticker line that creators add in the video composer.
--
-- Why this column exists:
--   The video composer ("Create > Video > On-video text") shows a centered
--   sticker line drawn over the live preview. Until now, on POST that line
--   was only merged into `posts.caption` -- it never reappeared on top of
--   the video in the feed. Creators expected WYSIWYG ("the line I see over
--   my preview should be over my posted video"). This column gives the feed
--   renderer a dedicated field to draw the same overlay on top of the
--   playing video, with no re-encoding required.
--
-- Length is capped to match the composer's TextInput maxLength (80 chars)
-- so we never store a payload that wouldn't fit on the preview either.

alter table public.posts
  add column if not exists video_overlay_text text;

alter table public.posts
  drop constraint if exists posts_video_overlay_text_length_ck;

alter table public.posts
  add constraint posts_video_overlay_text_length_ck
  check (
    video_overlay_text is null
    or char_length(video_overlay_text) <= 80
  );

comment on column public.posts.video_overlay_text is
  'Optional on-video sticker line (<=80 chars) added in the video composer. Rendered as a centered <Text> overlay on top of the feed video player. Not baked into the underlying MP4.';
