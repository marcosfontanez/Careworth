-- 052_profile_song_artwork.sql
--
-- Adds `profile_song_artwork_url` so "Current Vibe" can persist the
-- album artwork alongside title / artist / audio URL. Nullable because
-- older rows (pre-iTunes picker) don't have artwork, and because the
-- Customize My Pulse flow still allows users to paste a raw audio URL
-- without an accompanying cover.
--
-- Safe to re-run: guarded with `if not exists`.

alter table public.profiles
  add column if not exists profile_song_artwork_url text;

comment on column public.profiles.profile_song_artwork_url is
  'Album artwork URL for Current Vibe (usually an iTunes 600x600 JPG picked via the Song Picker).';
