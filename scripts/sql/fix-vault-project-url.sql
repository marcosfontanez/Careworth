-- Fix placeholder project_url Vault secret (required for pg_net cron → Edge Functions).
select vault.update_secret(
  (select id from vault.secrets where name = 'project_url' limit 1),
  'https://sakrlbmzmfvdywqgyqxh.supabase.co',
  'project_url',
  'Base URL for scheduled Edge Function calls'
);

select name, left(decrypted_secret, 50) as url_prefix
from vault.decrypted_secrets
where name = 'project_url';
