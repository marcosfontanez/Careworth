-- Profile "Now Playing" — persisted for public display on profile
alter table public.profiles
  add column if not exists profile_song_title text,
  add column if not exists profile_song_artist text,
  add column if not exists profile_song_url text;

comment on column public.profiles.profile_song_title is 'Track title shown on profile Now Playing widget';
comment on column public.profiles.profile_song_artist is 'Artist name for Now Playing';
comment on column public.profiles.profile_song_url is 'Optional link (Spotify, Apple Music, YouTube, etc.)';
