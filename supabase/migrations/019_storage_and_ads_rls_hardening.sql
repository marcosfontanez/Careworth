-- Hardening to avoid security + abuse headaches later:
-- 1) Remove permissive Storage INSERT policies from 008 (keep 001 folder-scoped rules).
-- 2) Enable RLS on ad_campaigns + policies aligned with services/monetization/ads.ts

-- ─── Storage: uploads must stay under auth.uid() first folder (001 policies remain) ───
drop policy if exists "Authenticated users can upload post media" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;

-- Reads/deletes/updates from 001 + 008 keep working; app uses `${userId}/...` in lib/storage.ts.

-- ─── Ad campaigns: was wide open for any authenticated client ───
alter table public.ad_campaigns enable row level security;

-- Feed + sponsored slot: active campaigns in their date window (applies to anon + authenticated)
drop policy if exists "Anyone can read active ad campaigns" on public.ad_campaigns;
create policy "Anyone can read active ad campaigns"
  on public.ad_campaigns for select
  using (
    status = 'active'
    and start_date <= now()
    and end_date >= now()
  );

-- Admin UI: list/create/edit all campaigns
drop policy if exists "Admins can read all ad campaigns" on public.ad_campaigns;
create policy "Admins can read all ad campaigns"
  on public.ad_campaigns for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );

drop policy if exists "Admins can insert ad campaigns" on public.ad_campaigns;
create policy "Admins can insert ad campaigns"
  on public.ad_campaigns for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );

drop policy if exists "Admins can update ad campaigns" on public.ad_campaigns;
create policy "Admins can update ad campaigns"
  on public.ad_campaigns for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );

-- RPCs increment_ad_impression / increment_ad_click are SECURITY DEFINER — still update counts without client bypassing these policies.
