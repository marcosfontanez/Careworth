-- My Pulse comments: record @mentions + notifications (parity with post_comment / circle_reply).

ALTER TABLE public.mentions DROP CONSTRAINT IF EXISTS mentions_content_type_check;

ALTER TABLE public.mentions ADD CONSTRAINT mentions_content_type_check
  CHECK (content_type IN (
    'profile_update',
    'post',
    'post_comment',
    'circle_thread',
    'circle_reply',
    'profile_update_comment'
  ));

CREATE OR REPLACE FUNCTION public.mentions_for_profile_update_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_handle text;
BEGIN
  BEGIN
    SELECT username INTO author_handle FROM public.profiles WHERE id = new.author_id;
    PERFORM public.record_mentions(
      'profile_update_comment',
      new.id,
      new.author_id,
      COALESCE(new.content, ''),
      COALESCE('@' || author_handle, 'Someone') || ' mentioned you in a Pulse comment',
      new.update_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_trigger_error(
      'mentions_for_profile_update_comment', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('comment_id', new.id)
    );
  END;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_update_comments_mentions ON public.profile_update_comments;
CREATE TRIGGER tr_profile_update_comments_mentions
  AFTER INSERT ON public.profile_update_comments
  for each row execute function public.mentions_for_profile_update_comment();
