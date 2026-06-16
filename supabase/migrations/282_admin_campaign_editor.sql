-- Admin P1: Campaign Editor — extend ad_campaigns for staff CRM + cancelled status.

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_status_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_status_check
  check (status in ('draft', 'active', 'paused', 'completed', 'cancelled'));

alter table public.ad_campaigns
  add column if not exists objective text,
  add column if not exists internal_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists lead_id uuid references public.marketing_contact_messages(id) on delete set null,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_ad_campaigns_status_start
  on public.ad_campaigns (status, start_date desc);

create index if not exists idx_ad_campaigns_lead_id
  on public.ad_campaigns (lead_id)
  where lead_id is not null;

create index if not exists idx_ad_campaigns_owner_id
  on public.ad_campaigns (owner_id)
  where owner_id is not null;

insert into public.feature_flags (key, enabled, description)
values (
  'admin_campaign_editor_enabled',
  true,
  'Web Staff Portal campaign create/edit UI (internal planning records only)'
)
on conflict (key) do update set
  description = excluded.description;
