-- Harden chat pin RLS: host pin/unpin only while stream is live and not ended.
-- Safe to apply after 045. Complements stream_questions host UPDATE policies in 202.

DROP POLICY IF EXISTS "Hosts can create pins" ON public.stream_pinned_messages;
CREATE POLICY "Hosts can create pins"
  ON public.stream_pinned_messages FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id::text = stream_id
        AND ls.host_id = auth.uid()
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Hosts can unpin" ON public.stream_pinned_messages;
CREATE POLICY "Hosts can unpin"
  ON public.stream_pinned_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id::text = stream_id
        AND ls.host_id = auth.uid()
        AND ls.status = 'live'
        AND ls.ended_at IS NULL
    )
  );

-- At most one active chat pin per stream (service deactivates previous before insert).
CREATE UNIQUE INDEX IF NOT EXISTS stream_pinned_messages_one_active_per_stream
  ON public.stream_pinned_messages (stream_id)
  WHERE is_active = true;
