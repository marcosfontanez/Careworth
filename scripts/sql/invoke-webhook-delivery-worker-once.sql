-- Invoke deliver-webhook-outbox once (flag-off smoke: expect disabled summary).
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
         || '/functions/v1/deliver-webhook-outbox',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'circle_prompts_cron_secret' limit 1)
  ),
  body := '{}'::jsonb
) as request_id;

select singleton_key, last_status, last_run_at, last_summary
from public.webhook_worker_state;
