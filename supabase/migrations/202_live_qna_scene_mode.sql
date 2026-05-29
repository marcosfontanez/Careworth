-- Live scene modes (viewer-synced overlays) + Q&A question queue.
-- Safe to apply after 201. Client falls back gracefully if not yet applied.

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS scene_mode text NOT NULL DEFAULT 'live';

ALTER TABLE public.live_streams
  DROP CONSTRAINT IF EXISTS live_streams_scene_mode_check;

ALTER TABLE public.live_streams
  ADD CONSTRAINT live_streams_scene_mode_check
  CHECK (scene_mode IN ('live', 'brb', 'starting_soon', 'ending_soon', 'qna'));

COMMENT ON COLUMN public.live_streams.scene_mode IS
  'Host-controlled scene overlay synced to viewers (does not end LiveKit room).';

CREATE TABLE IF NOT EXISTS public.stream_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  question text NOT NULL CHECK (char_length(trim(question)) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'pinned', 'answered', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);

CREATE INDEX IF NOT EXISTS stream_questions_stream_status_idx
  ON public.stream_questions (stream_id, status, created_at DESC);

ALTER TABLE public.stream_questions ENABLE ROW LEVEL SECURITY;

-- SELECT: any signed-in user may read questions on a live, non-ended stream.
DROP POLICY IF EXISTS stream_questions_select ON public.stream_questions;
CREATE POLICY stream_questions_select ON public.stream_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = stream_questions.stream_id
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
    )
  );

-- INSERT: viewer submits own question on live stream.
DROP POLICY IF EXISTS stream_questions_insert ON public.stream_questions;
CREATE POLICY stream_questions_insert ON public.stream_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = stream_questions.stream_id
        AND ls.host_id <> auth.uid()
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
        AND ls.broadcast_started_at IS NOT NULL
    )
  );

-- UPDATE: host manages queue (pin / answered / dismiss).
DROP POLICY IF EXISTS stream_questions_host_update ON public.stream_questions;
CREATE POLICY stream_questions_host_update ON public.stream_questions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = stream_questions.stream_id
        AND ls.host_id = auth.uid()
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = stream_questions.stream_id
        AND ls.host_id = auth.uid()
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
    )
  );

-- Host scene mode update on own live row.
DROP POLICY IF EXISTS live_streams_host_scene_update ON public.live_streams;
CREATE POLICY live_streams_host_scene_update ON public.live_streams
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND status = 'live' AND ended_at IS NULL)
  WITH CHECK (host_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'stream_questions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_questions;
  END IF;
END $$;
