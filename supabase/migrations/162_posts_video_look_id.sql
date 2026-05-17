-- Read-side color grade for feed video (composer looks from lib/videoFilters).

alter table public.posts add column if not exists video_look_id text;

alter table public.posts drop constraint if exists posts_video_look_id_chk;

alter table public.posts
  add constraint posts_video_look_id_chk
  check (
    video_look_id is null
    or video_look_id in (
      'none',
      'warm',
      'cool',
      'bw',
      'vintage',
      'sepia',
      'noir',
      'glow',
      'vignette',
      'neon'
    )
  );

comment on column public.posts.video_look_id is
  'Composer color grade id — feed applies tint overlay (see tintForLook). Null or none = original.';
