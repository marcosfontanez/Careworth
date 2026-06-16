-- Register deliver-webhook-outbox pg_cron (uses existing Vault secrets).
-- Safe to re-run: unschedules prior job with the same name first.

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'deliver-webhook-outbox';

  perform cron.schedule(
    'deliver-webhook-outbox',
    '*/2 * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
               || '/functions/v1/deliver-webhook-outbox',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'circle_prompts_cron_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  raise notice 'deliver-webhook-outbox cron registered (every 2 minutes).';
end $$;

select jobname, schedule, active
from cron.job
where jobname = 'deliver-webhook-outbox';
