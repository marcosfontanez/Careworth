-- Extend live scene modes with Poll highlight (host-controlled, does not end LiveKit room).
-- Safe to apply after 202_live_qna_scene_mode.sql.

ALTER TABLE public.live_streams
  DROP CONSTRAINT IF EXISTS live_streams_scene_mode_check;

ALTER TABLE public.live_streams
  ADD CONSTRAINT live_streams_scene_mode_check
  CHECK (scene_mode IN ('live', 'brb', 'starting_soon', 'ending_soon', 'qna', 'poll'));

COMMENT ON COLUMN public.live_streams.scene_mode IS
  'Host-controlled scene overlay synced to viewers (live, brb, starting_soon, ending_soon, qna, poll).';
