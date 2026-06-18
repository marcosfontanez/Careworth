# calculate-circle-weekly-prompt-metrics

Aggregates engagement for every weekly prompt of a completed week into
`public.circle_weekly_prompt_metrics`, so the AI generator can learn which prompt
styles drive participation per Circle.

It is a thin wrapper over the SQL function
`public.calc_circle_weekly_prompt_metrics(week_start)` — the same function the
in-DB `pg_cron` job runs — so behavior is identical whether triggered by cron or
manually.

## Deploy

```bash
npx supabase functions deploy calculate-circle-weekly-prompt-metrics --no-verify-jwt
```

## Secrets (function env)

| Name | Required | Purpose |
|------|----------|---------|
| `CIRCLE_PROMPTS_CRON_SECRET` | one of these | Shared cron secret. Falls back to `CRON_SECRET`, then `DISPATCH_SCHEDULED_SECRET`. |
| `SUPABASE_URL` | yes | Project URL (auto-injected). |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEYS` | yes | Service role (auto-injected). |

## Auth

Send the cron secret in the `x-cron-secret` header. Missing secret → `503`;
wrong secret → `401`.

## Body (optional)

```json
{ "week_start_date": "2026-06-08" }
```

Defaults to the **previous completed week** (Monday-anchored, UTC).

## Schedule (Part 10)

This is **already scheduled in-DB** by migration 276 via `pg_cron`:

```
job: circle-weekly-prompt-metrics   cron: 0 10 * * 1   (Mon 10:00 UTC)
SQL: select public.calc_circle_weekly_prompt_metrics();
```

The Edge Function exists for manual backfills and so the whole pipeline can also
be driven from an external scheduler if `pg_cron` is unavailable. If you drive it
externally, run it **before** `generate-circle-weekly-prompts`.

## Failure behavior

The SQL function continues past per-prompt failures and returns a summary
(`prompts_calculated`, `prompts_failed`, `errors`).

## Metrics fields (Phase 7)

Each row includes at minimum: `post_count`, `comment_count`, `reaction_count`,
`unique_participants_count`, `engagement_score`, `prompt_style`, `week_start_date`,
`circle_id`, and `prompt_id`.

**`impressions_count`** is reserved for future prompt-card view tracking and
defaults to **0** in this phase. Current metrics measure creation, replies, and
reactions — not how many times the prompt card was shown.
