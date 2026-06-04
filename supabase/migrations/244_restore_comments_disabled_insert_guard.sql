-- ============================================================
-- PulseVerse: Restore the comments_disabled insert guard
-- ------------------------------------------------------------
-- WHY: migration 156 added an INSERT guard so that posts with
-- `comments_disabled = true` reject new comments. Migration 177 later
-- recreated the "Users can create comments" policy WITHOUT that check
-- (it only re-asserted author_id = auth.uid()), silently re-enabling
-- comments on posts where the creator disabled them. This restores the
-- guard using the initplan-optimized `(select auth.uid())` form from 177.
-- ============================================================

drop policy if exists "Users can create comments" on public.comments;

create policy "Users can create comments"
  on public.comments for insert
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and coalesce(p.comments_disabled, false) = false
    )
  );
