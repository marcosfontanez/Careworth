-- ============================================================
-- 043 — Comment soft-delete + 300-character cap
-- ============================================================
--
-- Two changes that apply to every comment / reply in the app:
--
-- 1. Soft delete via `deleted_at`
--    Authors can remove their own comments without orphaning the reply
--    chain underneath them. Clients render a tombstone ("User Removed
--    Their Comment") in place of the body when `deleted_at IS NOT NULL`,
--    so threads stay legible and replies still resolve to a parent.
--    A hard `delete` would cascade and silently nuke the conversation
--    (see `001_initial_schema.sql` — `parent_id ... on delete cascade`).
--
--    Soft-delete is just an UPDATE — the existing RLS policy
--    "Users can update own comments" (auth.uid() = author_id) already
--    grants exactly the access we need. No new policy required.
--
-- 2. 300-character cap, server-enforced
--    Defense in depth — the client TextInputs limit to 300 too, but
--    queued offline actions, third-party API consumers, and the eventual
--    cross-platform client(s) all hit the same DB, so the cap belongs in
--    the schema. We add the constraint as NOT VALID first so any pre-
--    existing comment that happened to exceed 300 chars (legacy seed
--    data, demo posts, imported content) doesn't break the migration.
--    The constraint enforces on every NEW insert/update.
-- ============================================================

-- 1. Soft-delete column ----------------------------------------------
alter table public.comments
  add column if not exists deleted_at timestamptz;

comment on column public.comments.deleted_at is
  'When set, the comment is treated as removed by its author. Clients '
  '   render a tombstone in place of the body so reply chains remain '
  '   navigable. Setting `deleted_at` is allowed by the existing '
  '   "Users can update own comments" RLS policy.';

-- Helpful index for any future "show only live comments" queries.
create index if not exists idx_comments_active
  on public.comments (post_id, created_at)
  where deleted_at is null;

-- 2. 300-character cap -----------------------------------------------
-- NOT VALID lets the constraint apply to all future writes without
-- forcing a full-table validation pass against historical rows. If we
-- ever want to enforce it retroactively we can `validate constraint`
-- after a one-shot truncate/migrate of any oversized rows.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_content_length_300'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_content_length_300
      check (char_length(content) <= 300)
      not valid;
  end if;
end $$;

comment on constraint comments_content_length_300 on public.comments is
  'Caps comment body at 300 characters. Mirrors the client-side maxLength '
  '   on every comment TextInput across the app. Added NOT VALID so any '
  '   legacy oversized rows are grandfathered in.';
