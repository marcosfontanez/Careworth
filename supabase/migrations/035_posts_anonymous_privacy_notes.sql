-- Anonymous post privacy (PulseVerse)
--
-- Application layer (`lib/postViewerPrivacy.ts`, `postsService`) redacts `creator_id` / profile
-- for rows where `is_anonymous` is true unless `auth.uid()` matches the author (passed as viewerId).
-- Visitors’ profile grids omit anonymous posts entirely (`getByUser` filter).
--
-- The PostgREST `posts` table remains readable with RLS `using (true)` from 001_initial_schema.sql
-- so existing clients and admin tooling keep working. Stricter column-level hiding would require
-- a dedicated read model (view + revoked direct table SELECT) in a future migration.

comment on column public.posts.is_anonymous is
  'When true, clients must not expose creator identity to non-authors; enforced in app + trigger 034 for confessions.';

comment on column public.posts.creator_id is
  'Real author uuid; anonymous posts still store the true id for RLS and author actions; public payloads redact in the app.';
