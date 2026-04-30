# Supabase RLS / Performance Review Checklist

**Audience:** maintainer running quarterly Supabase health-checks.
**Cadence:** once before launch, once a month after.

The Supabase SQL Editor and the Studio "Database → Indexes / Policies"
panels expose everything you need. No external tooling required.

---

## 1. Confirm migration `062_indexes_audit.sql` is applied

```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_posts_creator_created',
    'idx_comments_post_created',
    'idx_saved_posts_user_saved',
    'idx_notifications_user_unread',
    'idx_post_likes_post',
    'idx_follows_pair'
  );
```

You should see **6 rows**. If any are missing, the migration didn't
finish (check the SQL Editor **Results** tab for errors, or re-run
`supabase/migrations/062_indexes_audit.sql`).

---

## 2. Hot-path query plans

Replace the UUIDs with real ones from `auth.users` and `public.posts`.

### 2a. Profile feed (most common SELECT)

```sql
explain analyze
select * from public.posts
 where creator_id = '<uuid>'
 order by created_at desc
 limit 50;
```

Want: `Index Scan using idx_posts_creator_created`.
Red flag: any `Sort` node, or `Seq Scan on posts`.

### 2b. Comments thread

```sql
explain analyze
select * from public.comments
 where post_id = '<uuid>'
 order by created_at desc
 limit 100;
```

Want: `Index Scan using idx_comments_post_created`.

### 2c. Unread notifications badge

```sql
explain analyze
select count(*) from public.notifications
 where user_id = '<uuid>' and read = false;
```

Want: `Index Only Scan using idx_notifications_user_unread`.
Heap fetches should be **0** (`Heap Fetches: 0` line).

### 2d. Pulse score RPC

```sql
explain analyze
select * from public.get_current_pulse_score('<uuid>');
```

Should complete in **<50 ms** for a typical user, **<200 ms** for a
power user with thousands of posts. If consistently slower, the
underlying `compute_pulse_subscores` aggregates need a materialized
view (see `docs/PERF_NEXT_STEPS.md`).

---

## 3. RLS policy index alignment

Every `RLS USING` clause should be indexable. Run:

```sql
select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Audit each `qual` (the predicate) and confirm:

| Pattern in `qual`              | Required index                                  |
| ------------------------------ | ----------------------------------------------- |
| `auth.uid() = user_id`         | btree on `user_id` ✓ (already standard)         |
| `auth.uid() = creator_id`      | btree on `creator_id` ✓                         |
| `auth.uid() = recipient_id`    | btree on `recipient_id` (verify on `messages`)  |
| `... is_anonymous = false`     | partial index helpful if hit-rate is low        |
| `... privacy_mode in (...)`    | small enum — full table scan acceptable         |

If any policy uses a column **without** an index, every SELECT pays a
full-table scan tax. Add the index in a follow-up migration.

---

## 4. Slow query log

Enable in Supabase dashboard:
**Settings → Database → Postgres logs → Slow queries (>100ms)**.

Review weekly. Anything that appears more than ~50 times/day in the log
is a candidate for an index, denormalized counter, or RPC rewrite.

---

## 5. Connection pooler verification

In the Supabase dashboard:
**Settings → Database → Connection string → URI**.

Production app should be using the **Transaction-mode pooler**
(`pgbouncer`) URI on port `6543`, not the direct connection on `5432`.
Direct connections cap at ~60 sockets on the Pro plan; pooled mode
multiplexes thousands of requests over the same backend connections.

Search the codebase for any hardcoded port `5432` references — there
shouldn't be any. Server-side jobs (e.g. the Fly.io export worker) must
use the pooler too unless they need a session-mode feature like
`LISTEN/NOTIFY`.

---

## 6. Storage bucket access patterns

```sql
select bucket_id, count(*) as objects, sum(metadata->>'size')::bigint as bytes
from storage.objects
group by bucket_id
order by bytes desc;
```

Watch for:
- `post-media` growth (each video is multi-MB).
- `exports` not being purged after 30 days — see the cleanup cron.
- `avatars` >2 MB per file (tighten upload validation if so).

---

## 7. Quarterly cleanup

```sql
-- Soft-deleted posts older than 90 days → hard delete
delete from public.posts
 where deleted_at is not null
   and deleted_at < now() - interval '90 days';

-- Trigger error log older than 30 days
delete from public.trigger_errors
 where created_at < now() - interval '30 days';

-- Engagement events older than 180 days (kept for analytics
-- aggregation, but not raw)
delete from public.engagement_events
 where created_at < now() - interval '180 days';
```

Schedule these as a Supabase scheduled function (`pg_cron`) once you're
on the Pro plan.

---

## 8. Platform / enterprise tables (`067` + `068`)

After `067_platform_enterprise_foundation.sql` (and `068_cleanup_placement_trust_rls.sql` if you had an older 067 apply), confirm objects exist:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'user_analytics_consent',
    'admin_audit_log',
    'feature_flags',
    'experiments',
    'experiment_assignments',
    'partner_api_keys',
    'webhook_outbox',
    'admin_saved_views',
    'scheduled_export_jobs',
    'placement_trust_scores',
    'fraud_review_queue',
    'warehouse_export_runs',
    'sponsor_deals',
    'compliance_tasks',
    'analytics_event_schema_versions'
  )
order by 1;
```

Expect **15 rows**. `placement_trust_scores` should have **one** admin-facing policy
(`Admins manage placement trust`), not a separate read-only duplicate.

**Notes**

- `experiment_assignments`: no INSERT policy for `authenticated` — writes are intended via **service role** (or future RPC). Same pattern as other ops tables.
- Admin dashboard loaders use the service role when `SUPABASE_SERVICE_ROLE_KEY` is set; RLS still protects ad-hoc SQL / misconfigured clients.

---

## 7. Enterprise / platform migrations (067–068)

1. Apply **`067_platform_enterprise_foundation.sql`** for admin audit log, feature flags, consent tables, partner/webhook stubs, and `profiles.preferred_locale` / digest prefs.
2. Apply **`068_cleanup_placement_trust_rls.sql`** if a prior 067 revision left a duplicate **`Admins read placement trust`** policy on `placement_trust_scores` (068 drops it; the ALL policy remains). Safe to re-run.

---

## Sign-off

| Date | Reviewer | Notes |
| ---- | -------- | ----- |
|      |          |       |
