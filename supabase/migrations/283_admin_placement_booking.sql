-- Admin P1: Placement catalog + campaign placement bookings (internal only).

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  surface text not null,
  device text not null default 'all'
    check (device in ('mobile', 'web', 'all')),
  is_active boolean not null default true,
  capacity_type text not null default 'shared'
    check (capacity_type in ('exclusive', 'shared', 'rotation')),
  max_active_campaigns integer not null default 1
    check (max_active_campaigns >= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_placement_bookings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'reserved', 'active', 'paused', 'completed', 'cancelled')),
  priority integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint campaign_placement_bookings_window check (end_at > start_at)
);

create index if not exists idx_ad_placements_surface_active
  on public.ad_placements (surface, is_active);

create index if not exists idx_bookings_placement_window
  on public.campaign_placement_bookings (placement_id, start_at, end_at);

create index if not exists idx_bookings_campaign
  on public.campaign_placement_bookings (campaign_id, start_at desc);

create index if not exists idx_bookings_status
  on public.campaign_placement_bookings (status)
  where status in ('draft', 'reserved', 'active', 'paused');

alter table public.ad_placements enable row level security;
alter table public.campaign_placement_bookings enable row level security;

drop policy if exists "Admins can read ad placements" on public.ad_placements;
create policy "Admins can read ad placements"
  on public.ad_placements for select
  to authenticated
  using (public.current_user_role_admin());

drop policy if exists "Admins can insert ad placements" on public.ad_placements;
create policy "Admins can insert ad placements"
  on public.ad_placements for insert
  to authenticated
  with check (public.current_user_role_admin());

drop policy if exists "Admins can update ad placements" on public.ad_placements;
create policy "Admins can update ad placements"
  on public.ad_placements for update
  to authenticated
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

drop policy if exists "Admins can read placement bookings" on public.campaign_placement_bookings;
create policy "Admins can read placement bookings"
  on public.campaign_placement_bookings for select
  to authenticated
  using (public.current_user_role_admin());

drop policy if exists "Admins can insert placement bookings" on public.campaign_placement_bookings;
create policy "Admins can insert placement bookings"
  on public.campaign_placement_bookings for insert
  to authenticated
  with check (public.current_user_role_admin());

drop policy if exists "Admins can update placement bookings" on public.campaign_placement_bookings;
create policy "Admins can update placement bookings"
  on public.campaign_placement_bookings for update
  to authenticated
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

insert into public.ad_placements (key, name, description, surface, device, capacity_type, max_active_campaigns, metadata)
values
  (
    'in_feed_sponsored',
    'In-feed sponsored',
    'Primary mobile feed sponsored slot (planning only — not live delivery).',
    'feed',
    'mobile',
    'shared',
    2,
    '{"legacy_title":"In-feed sponsored"}'::jsonb
  ),
  (
    'feed_hero',
    'Feed hero',
    'Top-of-feed hero placement.',
    'feed',
    'mobile',
    'exclusive',
    1,
    '{"legacy_title":"Feed hero"}'::jsonb
  ),
  (
    'live_stream_bumper',
    'Live stream bumper',
    'Pre/mid live stream bumper.',
    'live',
    'mobile',
    'rotation',
    3,
    '{"legacy_title":"Live stream bumper"}'::jsonb
  ),
  (
    'circle_spotlight',
    'Circle spotlight',
    'Featured circle room spotlight.',
    'circles',
    'mobile',
    'shared',
    2,
    '{"legacy_title":"Circle spotlight"}'::jsonb
  ),
  (
    'profile_banner',
    'Profile banner',
    'My Pulse / profile banner rail.',
    'my_pulse',
    'mobile',
    'exclusive',
    1,
    '{"legacy_title":"Profile banner"}'::jsonb
  ),
  (
    'creator_hub_slot',
    'Creator hub slot',
    'Creator hub featured module.',
    'creator_hub',
    'mobile',
    'shared',
    1,
    '{"legacy_title":"Creator hub slot"}'::jsonb
  ),
  (
    'web_partner_rail',
    'Web partner rail',
    'Marketing web partner rail (internal planning).',
    'web',
    'web',
    'shared',
    2,
    '{"legacy_title":"Web partner rail"}'::jsonb
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  surface = excluded.surface,
  device = excluded.device,
  capacity_type = excluded.capacity_type,
  max_active_campaigns = excluded.max_active_campaigns,
  updated_at = now();

insert into public.feature_flags (key, enabled, description)
values (
  'admin_placement_booking_enabled',
  true,
  'Web staff placement booking UI and inventory ledger (internal planning only)'
)
on conflict (key) do update set
  description = excluded.description;
