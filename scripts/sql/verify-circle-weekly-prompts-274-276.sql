-- Verification for migrations 274–276 (Circle weekly AI prompts + metrics).
-- Run in the Supabase SQL Editor AFTER applying 274, 275, 276. Read-only.

-- 1. Tables exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'circle_weekly_prompts',
    'circle_prompt_configs',
    'circle_weekly_prompt_metrics'
  )
order by table_name;
-- Expect 3 rows.

-- 2. Linkage columns added (nullable) on posts + circle_threads.
select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'weekly_prompt_id'
  and table_name in ('posts', 'circle_threads')
order by table_name;
-- Expect 2 rows, both is_nullable = YES, data_type = uuid.

-- 3. Functions exist.
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'circle_week_start',
    'get_current_circle_weekly_prompt',
    'calc_circle_weekly_prompt_metrics'
  )
order by proname;
-- Expect 3 rows.

-- 4. RLS enabled on all three new tables.
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'circle_weekly_prompts',
    'circle_prompt_configs',
    'circle_weekly_prompt_metrics'
  )
order by relname;
-- Expect relrowsecurity = true for all.

-- 5. circle_weekly_prompts is readable (active) but NOT writable by clients:
--    only a SELECT policy should exist; no insert/update/delete policies.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'circle_weekly_prompts'
order by policyname;
-- Expect a single SELECT policy ("Anyone can read active weekly prompts").

-- 6. Config + metrics tables are server-only (no anon/authenticated policies).
select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in ('circle_prompt_configs', 'circle_weekly_prompt_metrics')
group by tablename;
-- Expect 0 rows (no policies) → clients denied; service_role bypasses RLS.

-- 7. Prompt configs seeded for the public Circles (migration 273 must be applied).
select cpc.circle_slug, cpc.tone is not null as has_tone, array_length(cpc.banned_topics, 1) as banned_count
from public.circle_prompt_configs cpc
order by cpc.circle_slug;
-- Expect ~12 rows (petverse, the-drama-room with banned_topics, money-moves, ...).

-- 8. Week-start helper returns a Monday.
select public.circle_week_start(now()) as this_monday,
       extract(isodow from public.circle_week_start(now())) as isodow; -- expect 1 (Monday)

-- 9. pg_cron metrics job scheduled (only if pg_cron is installed).
select jobname, schedule
from cron.job
where jobname = 'circle-weekly-prompt-metrics';
-- Expect: schedule '0 10 * * 1' (Mon 10:00 UTC). No rows if pg_cron not installed.

-- 10. Unique constraint guards one prompt per Circle per week.
select conname
from pg_constraint
where conrelid = 'public.circle_weekly_prompts'::regclass
  and contype = 'u';
-- Expect circle_weekly_prompts_circle_week_uq.
