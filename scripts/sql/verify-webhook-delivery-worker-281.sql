-- Post-281 verification: destinations, worker state, claim RPC exists.

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'webhook_outbox'
  and column_name in ('next_attempt_at', 'destination_id')
order by column_name;

select to_regclass('public.webhook_destinations') as webhook_destinations;
select to_regclass('public.webhook_worker_state') as webhook_worker_state;

select proname
from pg_proc
where proname = 'webhook_outbox_claim_batch';

select singleton_key, last_status, last_run_at, last_summary
from public.webhook_worker_state;

select count(*) filter (where is_active) as active_destinations
from public.webhook_destinations;
