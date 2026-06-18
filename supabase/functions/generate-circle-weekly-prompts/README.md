# generate-circle-weekly-prompts

Generates one fresh weekly **"This Week"** conversation-starter prompt for every
Circle (`public.communities` row) using OpenAI, and writes it to
`public.circle_weekly_prompts`. It uses each Circle's identity + prior prompt
history + prior performance metrics so prompts get smarter and avoid repetition.

The mobile client **never** calls OpenAI and never sees the API key — generation
is server-only.

## Deploy

```bash
npx supabase functions deploy generate-circle-weekly-prompts --no-verify-jwt
```

## Secrets (function env)

| Name | Required | Purpose |
|------|----------|---------|
| `OPENAI_API_KEY` | yes | LLM key (server-only). |
| `CIRCLE_PROMPTS_MODEL` | no | Model name (default `gpt-4o-mini`). |
| `CIRCLE_PROMPTS_CRON_SECRET` | one of these | Shared cron secret. Falls back to `CRON_SECRET`, then `DISPATCH_SCHEDULED_SECRET`. |
| `SUPABASE_URL` | yes | Project URL (auto-injected). |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEYS` | yes | Service role (auto-injected). |

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set CIRCLE_PROMPTS_CRON_SECRET=<long-random-string>
```

## Auth

Every request must send the cron secret in the `x-cron-secret` header. Missing
secret config → `503`; wrong secret → `401`.

## Body (all optional)

```json
{
  "force": true,
  "circle_slug": "petverse",
  "week_start_date": "2026-06-15",
  "dry_run": true
}
```

- `force` — regenerate even if a prompt already exists for the week.
- `circle_slug` — limit to one Circle (manual regeneration).
- `week_start_date` — override the week (defaults to the current Monday, UTC).
- `dry_run` — generate + run the similarity guard but do not write.

## Manual trigger

```bash
curl -X POST "$SUPABASE_URL/functions/v1/generate-circle-weekly-prompts" \
  -H "x-cron-secret: <secret>" -H "Content-Type: application/json" \
  -d '{"force":true,"circle_slug":"petverse"}'
```

## Schedule (Part 10) — version-controlled

Runs **every Monday at 10:15 UTC, after** `calculate-circle-weekly-prompt-metrics`
(metrics is in-DB via `pg_cron` at `0 10 * * 1`).

The generation schedule is committed in **`supabase/migrations/277_schedule_circle_weekly_prompt_generation.sql`**.
It uses `pg_cron` + `pg_net` to POST this function, reading the project URL and
cron secret from **Supabase Vault** (no secret hardcoded in SQL).

**One-time setup** — create the two Vault secrets, then re-run `supabase db push`
(the migration is fail-safe and skips scheduling until they exist):

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url', 'Scheduled Edge Function base URL');
select vault.create_secret('<your-cron-secret>', 'circle_prompts_cron_secret', 'x-cron-secret for circle prompt cron');
```

Use the **same** `<your-cron-secret>` value as the `CIRCLE_PROMPTS_CRON_SECRET`
function env. If you prefer the Dashboard, you can instead add a Schedule under
**Edge Functions → Schedules** at `15 10 * * 1` with header `x-cron-secret`.

**Timezone assumption:** 10:00–10:15 UTC ≈ 06:00–06:15 America/New_York during
EDT (UTC-4); 05:00–05:15 ET during EST. The schedule is UTC-fixed.

## Failure behavior

- One Circle failing never aborts the run; failures are collected per slug.
- If OpenAI/generation fails, no row is written for that Circle — the app falls
  back to the latest active prompt or a local fallback, so the UI never breaks.
