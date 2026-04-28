-- 057_content_editing.sql
--
-- Adds owner-only EDIT support across the four content surfaces where the
-- app already exposes a delete affordance:
--
--   1. public.comments                 (feed post comments)
--   2. public.profile_update_comments  (My Pulse comments)
--   3. public.posts                    (feed / circle posts)
--   4. public.profile_updates          (My Pulse rows)
--
-- Each table gets:
--   - An `edited_at timestamptz` column so the UI can render an
--     "· edited" badge next to the timestamp and backfills stay
--     safe (null means "never edited").
--   - A BEFORE-UPDATE trigger that stamps `edited_at = now()` any time
--     the user-editable body field changes. We deliberately DO NOT
--     stamp `edited_at` for non-body mutations (soft delete, pin
--     toggle, like-count bump, etc.) — otherwise a cascading cache
--     invalidation could paint every post as edited.
--
-- For `profile_update_comments` we also add a missing UPDATE RLS
-- policy — the original migration (054) only shipped SELECT / INSERT /
-- DELETE, so no client could edit even their own row.
--
-- Idempotent throughout. Safe to re-run.

-- ──────────────────────────────────────────────────────────────────────
-- 1. Columns
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.profile_update_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.profile_updates
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────
-- 2. Missing UPDATE policy on profile_update_comments
-- ──────────────────────────────────────────────────────────────────────
-- Without this, even a SECURITY INVOKER service call from the client
-- would fail with "new row violates row-level security policy" when the
-- author tries to edit their own comment. Limit to the author row.

DROP POLICY IF EXISTS profile_update_comments_update_own ON public.profile_update_comments;
CREATE POLICY profile_update_comments_update_own
  ON public.profile_update_comments
  FOR UPDATE
  USING  (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- ──────────────────────────────────────────────────────────────────────
-- 3. Body-change triggers (stamp edited_at = now() only when body
--    actually changes; skip for soft-delete / engagement / pin flips).
-- ──────────────────────────────────────────────────────────────────────

-- 3a. Feed + My Pulse comments both store the body in `content`, so a
--     single helper covers both tables.
CREATE OR REPLACE FUNCTION public.stamp_edited_at_on_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_stamp_edited_at ON public.comments;
CREATE TRIGGER trg_comments_stamp_edited_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_edited_at_on_content();

DROP TRIGGER IF EXISTS trg_profile_update_comments_stamp_edited_at
  ON public.profile_update_comments;
CREATE TRIGGER trg_profile_update_comments_stamp_edited_at
  BEFORE UPDATE ON public.profile_update_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_edited_at_on_content();

-- 3b. Feed posts carry the body in `caption` (not `content`). We want
--     hashtags / privacyMode edits (if we ever add them) to count as
--     edits too, so compare both caption AND hashtags.
CREATE OR REPLACE FUNCTION public.stamp_edited_at_on_post_body()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF  NEW.caption   IS DISTINCT FROM OLD.caption
   OR NEW.hashtags  IS DISTINCT FROM OLD.hashtags
  THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_stamp_edited_at ON public.posts;
CREATE TRIGGER trg_posts_stamp_edited_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_edited_at_on_post_body();

-- 3c. Profile updates (My Pulse posts): body-like fields are `content`,
--     `preview_text`, `linked_url`, `linked_discussion_title`, `mood`,
--     and `pics_urls`. We stamp edited_at when ANY of those drift.
CREATE OR REPLACE FUNCTION public.stamp_edited_at_on_profile_update_body()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF  NEW.content                  IS DISTINCT FROM OLD.content
   OR NEW.preview_text             IS DISTINCT FROM OLD.preview_text
   OR NEW.linked_url               IS DISTINCT FROM OLD.linked_url
   OR NEW.linked_discussion_title  IS DISTINCT FROM OLD.linked_discussion_title
   OR NEW.mood                     IS DISTINCT FROM OLD.mood
   OR NEW.pics_urls                IS DISTINCT FROM OLD.pics_urls
  THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_updates_stamp_edited_at
  ON public.profile_updates;
CREATE TRIGGER trg_profile_updates_stamp_edited_at
  BEFORE UPDATE ON public.profile_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_edited_at_on_profile_update_body();
