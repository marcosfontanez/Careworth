-- Webhook delivery worker: destinations, worker heartbeat, claim/backoff columns, RPCs.
-- Worker runs via Edge Function deliver-webhook-outbox (scheduled cron).

-- ---------------------------------------------------------------------------
-- Outbox delivery scheduling
-- ---------------------------------------------------------------------------
alter table public.webhook_outbox
  add column if not exists next_attempt_at timestamptz,
  add column if not exists destination_id uuid;

comment on column public.webhook_outbox.next_attempt_at is
  'Do not claim for delivery before this time (exponential backoff).';
comment on column public.webhook_outbox.destination_id is
  'Destination that successfully received this event (when delivered).';

create index if not exists idx_webhook_outbox_deliverable
  on public.webhook_outbox (status, next_attempt_at nulls first, created_at)
  where status in ('pending', 'failed', 'retrying');

-- ---------------------------------------------------------------------------
-- Destinations (URL + event filters; signing secrets live in Edge env only)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  is_active boolean not null default true,
  event_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'
);

comment on table public.webhook_destinations is
  'Outbound webhook endpoints. Signing secrets are NOT stored here — use metadata.signing_secret_env_key on the Edge Function.';
comment on column public.webhook_destinations.event_types is
  'Empty array = receive all event types; otherwise only listed types are delivered.';

create index if not exists idx_webhook_destinations_active
  on public.webhook_destinations (is_active)
  where is_active = true;

alter table public.webhook_destinations enable row level security;

drop policy if exists "Staff read webhook destinations" on public.webhook_destinations;
create policy "Staff read webhook destinations"
  on public.webhook_destinations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.role_admin, false) = true
    )
  );

-- No client INSERT/UPDATE/DELETE — manage via service role / SQL / future admin UI.

alter table public.webhook_outbox
  drop constraint if exists webhook_outbox_destination_id_fkey;

alter table public.webhook_outbox
  add constraint webhook_outbox_destination_id_fkey
  foreign key (destination_id) references public.webhook_destinations(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Worker heartbeat (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_worker_state (
  singleton_key text primary key default 'default',
  last_run_at timestamptz,
  last_status text not null default 'unknown',
  last_summary jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

comment on table public.webhook_worker_state is
  'Last webhook delivery worker run metadata (Edge Function heartbeat).';

insert into public.webhook_worker_state (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

alter table public.webhook_worker_state enable row level security;

drop policy if exists "Staff read webhook worker state" on public.webhook_worker_state;
create policy "Staff read webhook worker state"
  on public.webhook_worker_state for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.role_admin, false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- Atomic claim for concurrent-safe delivery
-- ---------------------------------------------------------------------------
create or replace function public.webhook_outbox_claim_batch(
  p_limit int default 20,
  p_max_attempts int default 5,
  p_min_age_seconds int default 2,
  p_stale_lock_seconds int default 300
)
returns setof public.webhook_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select wo.id
    from public.webhook_outbox wo
    where (
      wo.status in ('pending', 'failed')
      and wo.attempts < p_max_attempts
      and (wo.next_attempt_at is null or wo.next_attempt_at <= now())
      and wo.created_at <= now() - make_interval(secs => greatest(0, p_min_age_seconds))
    )
    or (
      wo.status = 'retrying'
      and wo.last_attempted_at is not null
      and wo.last_attempted_at <= now() - make_interval(secs => greatest(60, p_stale_lock_seconds))
      and wo.attempts < p_max_attempts
    )
    order by wo.created_at asc
    limit greatest(1, least(coalesce(nullif(p_limit, 0), 20), 50))
    for update skip locked
  )
  update public.webhook_outbox wo
  set
    status = 'retrying',
    last_attempted_at = now()
  from candidates c
  where wo.id = c.id
  returning wo.*;
end;
$$;

revoke all on function public.webhook_outbox_claim_batch(int, int, int, int) from public;
grant execute on function public.webhook_outbox_claim_batch(int, int, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- Schedule worker (pg_cron + pg_net) — idempotent, skips if prerequisites missing
-- ---------------------------------------------------------------------------
do $$
declare
  v_has_cron boolean;
  v_has_net boolean;
  v_has_url boolean;
  v_has_secret boolean;
begin
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice '[281] could not enable pg_net (%): webhook schedule skipped.', sqlerrm;
  end;

  select exists (select 1 from pg_extension where extname = 'pg_cron') into v_has_cron;
  select exists (select 1 from pg_extension where extname = 'pg_net') into v_has_net;

  if not v_has_cron or not v_has_net then
    raise notice '[281] pg_cron/pg_net not available — schedule deliver-webhook-outbox via Dashboard instead.';
    return;
  end if;

  select exists (select 1 from vault.secrets where name = 'project_url') into v_has_url;
  select exists (
    select 1 from vault.secrets
    where name in ('webhook_delivery_cron_secret', 'cron_secret', 'dispatch_scheduled_secret')
  ) into v_has_secret;

  if not v_has_url or not v_has_secret then
    raise notice '[281] Vault secrets missing — create project_url and webhook_delivery_cron_secret (or cron_secret) then re-run.';
    return;
  end if;

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
          'x-cron-secret', coalesce(
            (select decrypted_secret from vault.decrypted_secrets where name = 'webhook_delivery_cron_secret' limit 1),
            (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
            (select decrypted_secret from vault.decrypted_secrets where name = 'dispatch_scheduled_secret' limit 1)
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  raise notice '[281] Scheduled deliver-webhook-outbox every 2 minutes.';
end $$;
