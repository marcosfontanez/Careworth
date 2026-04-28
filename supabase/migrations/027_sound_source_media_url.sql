-- Denormalized URL for attributed-sound playback (source post's video/audio file).
-- Feed can play this in expo-av while muting the remix video's embedded track.

alter table public.posts
  add column if not exists sound_source_media_url text;

comment on column public.posts.sound_source_media_url is 'Media URL (usually source post video) whose audio plays for this clip when sound_source_post_id is set';

-- Backfill from source post media (older remix rows only had sound_source_post_id).
update public.posts child
set sound_source_media_url = parent.media_url
from public.posts parent
where child.sound_source_post_id = parent.id
  and child.sound_source_media_url is null
  and parent.media_url is not null
  and length(trim(parent.media_url)) > 0;
