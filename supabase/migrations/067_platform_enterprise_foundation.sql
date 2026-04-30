-- Enterprise / growth foundation: audit, flags, partner API, webhooks queue, experiments,
-- trust/fraud/CRM/compliance stubs, profile prefs, consent (schema only — wire app separately).

-- ---------------------------------------------------------------------------
-- Profile extensions (i18n + notification prefs)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists preferred_locale text not null default 'en';
alter table public.profiles add column if not exists product_digest_email boolean not null default true;

-- ---------------------------------------------------------------------------
-- Consent (measurement / ads — policy layer in product)
-- ---------------------------------------------------------------------------
create table if not exists public.user_analytics_consent (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  analytics_allowed boolean not null default false,
  ads_measurement_allowed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_analytics_consent enable row level security;

drop policy if exists "Users manage own analytics consent" on public.user_analytics_consent;
create policy "Users manage own analytics consent"
  on public.user_analytics_consent for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read all analytics consent" on public.user_analytics_consent;
create policy "Admins read all analytics consent"
  on public.user_analytics_consent for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Admin audit log (immutable-style append)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_staff on public.admin_audit_log (staff_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log"
  on public.admin_audit_log for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins insert audit log" on public.admin_audit_log;
create policy "Admins insert audit log"
  on public.admin_audit_log for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
    and auth.uid() = staff_user_id
  );

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  rules jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "Admins manage feature flags" on public.feature_flags;
create policy "Admins manage feature flags"
  on public.feature_flags for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

insert into public.feature_flags (key, enabled, description)
values
  ('partner_api', false, 'Enable partner REST keys + /api/partner/v1/*'),
  ('experimentation', false, 'Server-side experiment assignment hooks'),
  ('webhook_delivery', false, 'Background worker sends webhook_outbox (not implemented in Next yet)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Experiments (A/B)
-- ---------------------------------------------------------------------------
create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft',
  variants jsonb not null default '["control","treatment"]',
  created_at timestamptz not null default now()
);

create table if not exists public.experiment_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  experiment_slug text not null references public.experiments(slug) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, experiment_slug)
);

alter table public.experiments enable row level security;
alter table public.experiment_assignments enable row level security;

drop policy if exists "Admins manage experiments" on public.experiments;
create policy "Admins manage experiments"
  on public.experiments for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Users read own experiment assignments" on public.experiment_assignments;
create policy "Users read own experiment assignments"
  on public.experiment_assignments for select using (auth.uid() = user_id);

drop policy if exists "Admins read all experiment assignments" on public.experiment_assignments;
create policy "Admins read all experiment assignments"
  on public.experiment_assignments for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Partner API keys (store SHA-256 hash of raw key + server pepper)
-- ---------------------------------------------------------------------------
create table if not exists public.partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['read:health'],
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (key_hash)
);

create index if not exists idx_partner_api_keys_prefix on public.partner_api_keys (key_prefix) where revoked_at is null;

alter table public.partner_api_keys enable row level security;

drop policy if exists "Admins manage partner keys" on public.partner_api_keys;
create policy "Admins manage partner keys"
  on public.partner_api_keys for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Webhook outbox (worker drains; Next can enqueue)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_webhook_outbox_pending on public.webhook_outbox (status, created_at)
  where status = 'pending';

alter table public.webhook_outbox enable row level security;

drop policy if exists "Admins manage webhook outbox" on public.webhook_outbox;
create policy "Admins manage webhook outbox"
  on public.webhook_outbox for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Saved admin views
-- ---------------------------------------------------------------------------
create table if not exists public.admin_saved_views (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  route_path text not null,
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.admin_saved_views enable row level security;

drop policy if exists "Admins manage own saved views" on public.admin_saved_views;
create policy "Admins manage own saved views"
  on public.admin_saved_views for all
  using (
    auth.uid() = staff_user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  )
  with check (
    auth.uid() = staff_user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Scheduled exports (cron / worker — stub)
-- ---------------------------------------------------------------------------
create table if not exists public.scheduled_export_jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  export_kind text not null,
  cron_expr text,
  config jsonb not null default '{}',
  enabled boolean not null default false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.scheduled_export_jobs enable row level security;

drop policy if exists "Admins manage scheduled exports" on public.scheduled_export_jobs;
create policy "Admins manage scheduled exports"
  on public.scheduled_export_jobs for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Brand-safety / trust scores by placement (materialized by jobs)
-- ---------------------------------------------------------------------------
create table if not exists public.placement_trust_scores (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null,
  scope_id text,
  score numeric not null,
  breakdown jsonb not null default '{}',
  computed_at timestamptz not null default now()
);

create index if not exists idx_placement_trust_scope on public.placement_trust_scores (scope_type, scope_id, computed_at desc);

alter table public.placement_trust_scores enable row level security;

-- Single ALL policy for admins (avoid overlapping SELECT + ALL policies).
drop policy if exists "Admins read placement trust" on public.placement_trust_scores;

drop policy if exists "Admins manage placement trust" on public.placement_trust_scores;
create policy "Admins manage placement trust"
  on public.placement_trust_scores for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Fraud / IVT review queue (stub)
-- ---------------------------------------------------------------------------
create table if not exists public.fraud_review_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subject_type text,
  subject_id text,
  score numeric,
  payload jsonb not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_fraud_queue_open on public.fraud_review_queue (status, created_at desc);

alter table public.fraud_review_queue enable row level security;

drop policy if exists "Admins manage fraud queue" on public.fraud_review_queue;
create policy "Admins manage fraud queue"
  on public.fraud_review_queue for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Data warehouse export run log (stub)
-- ---------------------------------------------------------------------------
create table if not exists public.warehouse_export_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  row_count int,
  notes text
);

alter table public.warehouse_export_runs enable row level security;

drop policy if exists "Admins manage warehouse runs" on public.warehouse_export_runs;
create policy "Admins manage warehouse runs"
  on public.warehouse_export_runs for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Sponsor / advertiser CRM (stub)
-- ---------------------------------------------------------------------------
create table if not exists public.sponsor_deals (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  stage text not null default 'lead',
  est_value_cents int,
  starts_on date,
  ends_on date,
  notes text,
  owner_staff_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.sponsor_deals enable row level security;

drop policy if exists "Admins manage sponsor deals" on public.sponsor_deals;
create policy "Admins manage sponsor deals"
  on public.sponsor_deals for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Compliance program checklist (SOC2-oriented tasks — manual completion)
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'security',
  sort_order int not null default 0,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id)
);

alter table public.compliance_tasks enable row level security;

drop policy if exists "Admins manage compliance tasks" on public.compliance_tasks;
create policy "Admins manage compliance tasks"
  on public.compliance_tasks for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

insert into public.compliance_tasks (slug, title, category, sort_order) values
  ('access_review_quarterly', 'Quarterly admin access review', 'access', 10),
  ('rls_review', 'RLS policy review for PHI-adjacent tables', 'data', 20),
  ('dependency_sca', 'Dependency scanning in CI (npm audit / SCA)', 'security', 30),
  ('backup_restore_drill', 'Backup restore drill documented', 'availability', 40),
  ('penetration_test', 'Annual penetration test', 'security', 50),
  ('vendor_dpas', 'Subprocessor / DPA inventory current', 'privacy', 60),
  ('incident_runbook', 'Security incident response runbook', 'operations', 70),
  ('data_retention_jobs', 'Data retention / deletion automation', 'privacy', 80)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Analytics event schema registry (mobile + web contract)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_event_schema_versions (
  version int primary key,
  description text not null,
  spec jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.analytics_event_schema_versions enable row level security;

drop policy if exists "Admins manage analytics schema versions" on public.analytics_event_schema_versions;
create policy "Admins manage analytics schema versions"
  on public.analytics_event_schema_versions for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

insert into public.analytics_event_schema_versions (version, description, active)
values (1, 'Baseline PulseVerse product events (see web admin Platform)', true)
on conflict (version) do nothing;
