-- ============================================================================
-- Verification queries for migration 234 (feed ranker v3 + Top Today v2)
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1) Both new RPCs exist with correct signatures
select
  n.nspname  as schema,
  p.proname  as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_ranked_feed_v3', 'get_top_today_v2')
order by p.proname;

-- Expected:
--   get_ranked_feed_v3 | viewer_id uuid, feed_limit integer DEFAULT 50, exclude_post_ids uuid[] DEFAULT '{}'::uuid[]
--                      | returns: TABLE(post_id uuid, score double precision, source text)
--   get_top_today_v2   | viewer_uuid uuid DEFAULT NULL::uuid, feed_limit integer DEFAULT 50, exclude_post_ids uuid[] DEFAULT '{}'::uuid[]
--                      | returns: TABLE(post_id uuid, score double precision)


-- 2) EXECUTE grants are in place for both anon and authenticated roles
select
  n.nspname || '.' || p.proname as func,
  r.rolname,
  has_function_privilege(r.oid, p.oid, 'execute') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname in ('get_ranked_feed_v3', 'get_top_today_v2')
  and r.rolname in ('anon', 'authenticated')
order by p.proname, r.rolname;

-- Expected: 4 rows, all can_execute = true


-- 3) Legacy v2 / v1 / get_top_today still present (fallback path intact)
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_ranked_feed', 'get_ranked_feed_v2', 'get_top_today')
order by p.proname;

-- Expected: 3 rows (all three legacy functions still present)


-- 4) Smoke-test get_ranked_feed_v3 with your own user id (replace <your-uuid>)
-- This validates the function plans + executes; no rows is OK on an empty test
-- DB but the call should NOT error.
-- select * from public.get_ranked_feed_v3('<your-uuid>'::uuid, 5, '{}'::uuid[]);


-- 5) Smoke-test get_top_today_v2 as guest (viewer_uuid = null)
-- select * from public.get_top_today_v2(null, 5, '{}'::uuid[]);


-- 6) Smoke-test get_top_today_v2 with a signed-in user (replace <your-uuid>)
-- select * from public.get_top_today_v2('<your-uuid>'::uuid, 5, '{}'::uuid[]);


-- 7) Confirm exclude_post_ids actually filters (replace ids)
-- 7a. First call: capture an id from the result
-- with ranked as (
--   select * from public.get_ranked_feed_v3('<your-uuid>'::uuid, 3, '{}'::uuid[])
-- )
-- select * from ranked;

-- 7b. Second call: pass that id back; it MUST NOT appear in the result
-- select * from public.get_ranked_feed_v3(
--   '<your-uuid>'::uuid,
--   3,
--   array['<post-id-from-7a>'::uuid]
-- );


-- 8) Confirm not_interested is excluded at the SQL layer
-- Insert a synthetic not_interested row, run the ranker, confirm post does not
-- appear. Roll back so no test data persists.
--
-- begin;
-- insert into public.feed_user_actions (user_id, action, post_id)
-- values ('<your-uuid>', 'not_interested', '<a-public-post-id>');
-- select count(*) as should_be_zero
-- from public.get_ranked_feed_v3('<your-uuid>'::uuid, 50, '{}'::uuid[])
-- where post_id = '<a-public-post-id>';
-- rollback;


-- 9) Confirm hide_creator is excluded at the SQL layer
-- begin;
-- insert into public.feed_user_actions (user_id, action, creator_id)
-- values ('<your-uuid>', 'hide_creator', '<some-creator-id>');
-- select count(*) as should_be_zero
-- from public.get_ranked_feed_v3('<your-uuid>'::uuid, 50, '{}'::uuid[])
-- where post_id in (select id from public.posts where creator_id = '<some-creator-id>');
-- rollback;


-- 10) Confirm bidirectional block exclusion at the SQL layer
-- begin;
-- insert into public.blocked_users (blocker_id, blocked_id)
-- values ('<other-uuid>', '<your-uuid>'); -- they block you
-- -- Posts by the OTHER user should NOT appear in YOUR ranked feed
-- select count(*) as should_be_zero
-- from public.get_ranked_feed_v3('<your-uuid>'::uuid, 50, '{}'::uuid[])
-- where post_id in (select id from public.posts where creator_id = '<other-uuid>');
-- rollback;


-- 11) Confirm anonymous redaction is still enforced (handled by view, not RPC)
-- The ranker returns ids; anonymous redaction happens through `posts_viewer_safe`
-- in the hydration step. Sanity-check the view exists:
select to_regclass('public.posts_viewer_safe') as posts_viewer_safe_view;
-- Expected: 'posts_viewer_safe' (not null)
