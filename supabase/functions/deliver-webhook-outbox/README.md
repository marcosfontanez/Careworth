# deliver-webhook-outbox

Drains `webhook_outbox` rows to configured `webhook_destinations` when the `webhook_delivery` feature flag is on.

## Deploy

```bash
npx supabase functions deploy deliver-webhook-outbox --no-verify-jwt
```

Set Edge Function secrets:

- `WEBHOOK_DELIVERY_CRON_SECRET` — same value sent as `x-cron-secret` by pg_cron (or reuse `CRON_SECRET`)
- Optional per-destination signing: set env vars referenced by `webhook_destinations.metadata.signing_secret_env_key`

## Schedule

Migration `281_webhook_delivery_worker.sql` schedules pg_cron every **2 minutes** when Vault secrets exist:

- `project_url`
- `webhook_delivery_cron_secret` (or `cron_secret` / `dispatch_scheduled_secret`)

## Rollout

1. Apply migration 281
2. Deploy function + set secrets
3. Insert test destination (HTTPS) — **do not store signing secrets in the DB**
4. Keep `webhook_delivery` **off** until function is verified
5. Enqueue test event → turn flag **on** → confirm `delivered`
6. Enable partner destinations only after signing secrets are configured on the function

## Destination rows

Manage via SQL (staff UI for destinations is future work):

```sql
insert into public.webhook_destinations (name, url, event_types, metadata)
values (
  'Internal test',
  'https://your-test-endpoint.example/hooks/pulseverse',
  array['test.ping']::text[],
  '{}'::jsonb
);
```

For HMAC signing, set `metadata`:

```json
{ "signing_secret_env_key": "WEBHOOK_SIGNING_PARTNER_A" }
```

and configure `WEBHOOK_SIGNING_PARTNER_A` on the Edge Function only.
