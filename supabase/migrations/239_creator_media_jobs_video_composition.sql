-- B-roll Studio V1: add the `video_composition` job kind so the creator-media-worker
-- can render true cutaway overlays (ffmpeg filtergraph) — distinct from the existing
-- sequential `stitch` / `broll` concat kinds, which are left untouched.
--
-- The `kind` CHECK constraint was created inline in migration 093
-- (`creator_media_jobs_kind_check`). We drop and recreate it with the new value.

alter table public.creator_media_jobs
  drop constraint if exists creator_media_jobs_kind_check;

alter table public.creator_media_jobs
  add constraint creator_media_jobs_kind_check
  check (kind in (
    'trim',
    'timelapse',
    'stitch',
    'broll',
    'video_composition',
    'pitch_shift',
    'background_matte',
    'face_blur',
    'silence_detect',
    'cinemagraph_export',
    'parallax_export'
  ));

comment on constraint creator_media_jobs_kind_check on public.creator_media_jobs is
  'Allowed worker job kinds. video_composition = B-roll Studio cutaway compositing (overlay over a time range), added 2026-05.';
