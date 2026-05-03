-- Keep profiles.follower_count / following_count aligned with public.follows.
-- Client follow toggles only insert/delete follows rows; without this trigger the
-- denormalized counters stay at zero everywhere (followers list, search, etc.).

CREATE OR REPLACE FUNCTION public.refresh_profile_follow_counts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET
    follower_count = (
      SELECT count(*)::int FROM public.follows f WHERE f.following_id = p_user_id
    ),
    following_count = (
      SELECT count(*)::int FROM public.follows f WHERE f.follower_id = p_user_id
    )
  WHERE p.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_follows_refresh_profile_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_profile_follow_counts(NEW.following_id);
    PERFORM public.refresh_profile_follow_counts(NEW.follower_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_profile_follow_counts(OLD.following_id);
    PERFORM public.refresh_profile_follow_counts(OLD.follower_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_follows_refresh_profile_counts ON public.follows;
CREATE TRIGGER trg_follows_refresh_profile_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_follows_refresh_profile_counts();

-- One-time backfill from follows (idempotent).
UPDATE public.profiles p
SET
  follower_count = (
    SELECT count(*)::int FROM public.follows f WHERE f.following_id = p.id
  ),
  following_count = (
    SELECT count(*)::int FROM public.follows f WHERE f.follower_id = p.id
  );
