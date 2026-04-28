-- ══════════════════════════════════════════════════════════════════════
-- 062_indexes_audit.sql
--
-- Index audit pass — adds the missing composite / partial indexes for
-- queries that currently force a sort or a re-filter on top of an
-- existing single-column index. Inferred from the application's hot
-- paths (the React Query hooks in `hooks/useQueries.ts` and the
-- service methods in `services/supabase/`):
--
--   • `useUserPosts(userId)` issues
--       posts.where(creator_id = $1).order(created_at desc)
--     We have `idx_posts_creator(creator_id)` but no composite, so
--     PostgreSQL has to filter then sort. A composite gives us a
--     direct index scan that returns rows in the desired order.
--
--   • `useComments(postId)` issues
--       comments.where(post_id = $1).order(created_at desc)
--     Same shape — `idx_comments_post(post_id)` exists but the sort
--     is unindexed. Composite removes the sort.
--
--   • `useSavedPosts` (per-user list) issues
--       saved_posts.where(user_id = $1).order(saved_at desc)
--     Same again. `idx_saved_posts_user(user_id)` is single-column.
--     Note: this table uses `saved_at`, not `created_at`.
--
--   • `useUnreadCount()` issues
--       notifications.where(user_id = $1 AND read = false).count()
--     Already covered by `idx_notifications_user(user_id, created_at)`
--     for the listing query, but the unread-count badge runs on
--     every notifications poll and only ever wants the unread
--     subset. A *partial* index keyed on `(user_id) where read = false`
--     is dramatically smaller and faster for that one
--     query — typical user has 0–2 unread notifications, so the
--     index is tiny and stays in shared_buffers permanently.
--
--   • `usePost` / "who liked this" / leaderboards run
--       post_likes.where(post_id = $1)
--     The existing `unique(user_id, post_id)` constraint creates an
--     implicit btree on `(user_id, post_id)` which Postgres CANNOT
--     use to look up by `post_id` alone (leftmost prefix rule). We
--     need a dedicated `post_id` index.
--
--   • `profiles.where(follower_id = $1, following_id = $2)`
--     ("am I following this creator?") shows up on every feed cell's
--     follow button. Single-column indexes exist on each side, but a
--     composite makes the lookup a single index probe.
--
-- We use plain `CREATE INDEX` (no `CONCURRENTLY`) so this file runs
-- inside Supabase's SQL Editor and `supabase db push`, which wrap the
-- script in a transaction. PostgreSQL rejects
-- `CREATE INDEX CONCURRENTLY` in any transaction block (error 25001).
--
-- Trade-off: each index build takes a short `SHARE UPDATE EXCLUSIVE`-style
-- window on the table. For launch-scale row counts this is usually
-- seconds. If you ever need zero-blocking builds on a massive table,
-- run *one* statement at a time in psql with autocommit (not in a
-- transaction), each as `CREATE INDEX CONCURRENTLY IF NOT EXISTS …`.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Posts: composite for "creator's posts in newest order".
-- Replaces a filter+sort with a direct index scan.
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_posts_creator_created
  on public.posts (creator_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Comments: composite for "comments on a post in newest order".
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_comments_post_created
  on public.comments (post_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Saved posts: composite for "my saved posts in newest order".
-- (`saved_at` is the timestamp column on this table — not `created_at`.)
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_saved_posts_user_saved
  on public.saved_posts (user_id, saved_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Notifications unread badge: partial index, only the rows that matter.
-- The notification badge is one of the most frequently issued queries
-- in the entire app — it ticks on every screen mount and on every
-- realtime broadcast — and a tiny dedicated index pays for itself
-- many times over.
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id)
  where read is false;

-- ─────────────────────────────────────────────────────────────────────
-- Post likes: lookup by post (the unique(user_id, post_id) constraint
-- only helps for user-led lookups; leaderboards & "who liked this"
-- queries need to scan by post).
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_post_likes_post
  on public.post_likes (post_id);

-- ─────────────────────────────────────────────────────────────────────
-- Follows: composite for the "am I following this creator?" probe
-- shown on every feed cell follow button. Without this Postgres
-- has to use a separate index per side and intersect.
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_follows_pair
  on public.follows (follower_id, following_id);

-- ─────────────────────────────────────────────────────────────────────
-- Refresh planner stats so the new indexes get picked up immediately
-- on the next query (without waiting for autoanalyze). Cheap and
-- safe — no lock acquisition.
-- ─────────────────────────────────────────────────────────────────────
analyze public.posts;
analyze public.comments;
analyze public.saved_posts;
analyze public.notifications;
analyze public.post_likes;
analyze public.follows;

-- ─────────────────────────────────────────────────────────────────────
-- Smoke check (run manually in the SQL Editor after applying):
--
--   explain analyze
--   select * from public.posts
--    where creator_id = '<some-uuid>'
--    order by created_at desc
--    limit 50;
--
-- Should show "Index Scan using idx_posts_creator_created on posts"
-- (no Sort node), and runtime should drop from ~30ms to <2ms on
-- creators with hundreds of posts.
--
-- For the unread-count partial index:
--
--   explain analyze
--   select count(*) from public.notifications
--    where user_id = '<some-uuid>' and read = false;
--
-- Should show "Index Only Scan using idx_notifications_user_unread"
-- (note: index-only, no heap fetch needed).
-- ─────────────────────────────────────────────────────────────────────
