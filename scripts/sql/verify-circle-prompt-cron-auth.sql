-- Dry auth check for Circle weekly prompt cron (no prompt generation side effects if body empty).
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
         || '/functions/v1/calculate-circle-weekly-prompt-metrics',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'circle_prompts_cron_secret' limit 1)
  ),
  body := '{}'::jsonb
) as request_id;
