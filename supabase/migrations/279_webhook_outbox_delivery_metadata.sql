-- Webhook outbox: delivery timestamps for admin monitoring + retry UI.
-- Expected status values: pending, retrying, delivered, failed, ignored.

alter table public.webhook_outbox
  add column if not exists last_attempted_at timestamptz;

comment on column public.webhook_outbox.last_attempted_at is
  'Timestamp of the most recent delivery attempt by the webhook worker.';

create index if not exists idx_webhook_outbox_failed_created
  on public.webhook_outbox (created_at desc)
  where status = 'failed';

create index if not exists idx_webhook_outbox_status_created
  on public.webhook_outbox (status, created_at desc);
