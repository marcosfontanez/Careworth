-- ============================================================
-- Circle weekly prompt generation cron
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 277_schedule_circle_weekly_prompt_generation.sql ----------
-- Migration 277: Version-controlled weekly schedule for AI prompt generation
--
-- The metrics job is already scheduled in-DB by migration 276 (pure SQL via
-- pg_cron, Mon 10:00 UTC). This migration schedules the AI GENERATION Edge
-- Function, which cannot run as pure SQL (it needs OpenAI + HTTP). We invoke it
-- over HTTP from pg_cron using pg_net, reading the project URL + cron secret
-- from Supabase Vault so NO secret is ever hardcoded in SQL.
--
-- Monday order:
--   10:00 UTC        calc_circle_weekly_prompt_metrics()      (migration 276, SQL)
--   10:00-11:45 UTC  POST /functions/v1/generate-circle-weekly-prompts every 15 min
--
-- Why a burst (every 15 min for ~2h) instead of a single fire: Edge Functions are
-- hard-killed at ~150s wall-clock, and low-tier OpenAI accounts cap at ~10 req/min.
-- A single pass cannot finish 25 Circles on the lowest tier. The function skips
-- Circles that already have this week's prompt (force=false), so repeated passes
-- converge until all 25 are filled, then become instant no-ops. On a higher OpenAI
-- tier the first pass finishes everything and the rest are cheap no-ops.
--
-- Timezone: UTC-fixed. 10:00 UTC â‰ˆ 06:00 America/New_York during EDT.
--
-- PREREQUISITE â€” create these two Vault secrets ONCE (Dashboard â†’ Project
-- Settings â†’ Vault, or SQL), then this job activates on the next deploy/run:
--
--   select vault.create_secret(
--     'https://<your-project-ref>.supabase.co', 'project_url',
--     'Base URL for scheduled Edge Function calls');
--   select vault.create_secret(
--     '<your-cron-secret>', 'circle_prompts_cron_secret',
--     'Shared secret sent as x-cron-secret to circle prompt cron functions');
--
-- The same <your-cron-secret> value must be set as CIRCLE_PROMPTS_CRON_SECRET
-- on the generate-circle-weekly-prompts function env.
--
-- Idempotent + fail-safe: applying this migration NEVER fails. If pg_cron /
-- pg_net / the Vault secrets are missing, it logs a NOTICE and skips scheduling
-- (re-run after the prerequisites exist, e.g. via `supabase db push`).

do $$
declare
  v_has_cron boolean;
  v_has_net boolean;
  v_has_url boolean;
  v_has_secret boolean;
begin
  -- pg_net is needed to make the outbound HTTPS call from pg_cron. It manages
  -- its own `net` schema, so we do not pin a schema here.
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice '[277] could not enable pg_net (%): generation schedule skipped.', sqlerrm;
  end;

  select exists (select 1 from pg_extension where extname = 'pg_cron') into v_has_cron;
  select exists (select 1 from pg_extension where extname = 'pg_net') into v_has_net;

  if not v_has_cron or not v_has_net then
    raise notice '[277] pg_cron/pg_net not available â€” generation schedule skipped. Schedule generate-circle-weekly-prompts via the Dashboard instead.';
    return;
  end if;

  -- Confirm the Vault secrets exist (so we never schedule a job that 401s).
  select exists (select 1 from vault.secrets where name = 'project_url') into v_has_url;
  select exists (select 1 from vault.secrets where name = 'circle_prompts_cron_secret') into v_has_secret;

  if not v_has_url or not v_has_secret then
    raise notice '[277] Vault secrets project_url / circle_prompts_cron_secret missing â€” generation schedule skipped. Create them (see header) and re-run this migration.';
    return;
  end if;

  -- Idempotent: clear any prior schedule of the same name.
  perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'circle-weekly-prompt-generate';

  perform cron.schedule(
    'circle-weekly-prompt-generate',
    '*/15 10-11 * * 1',
    $cron$
      select net.http_post(
        url := (
          select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
        ) || '/functions/v1/generate-circle-weekly-prompts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret from vault.decrypted_secrets where name = 'circle_prompts_cron_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 280000
      );
    $cron$
  );

  raise notice '[277] Scheduled circle-weekly-prompt-generate (Mon 10:15 UTC).';
end;
$$;


