-- Controlled sponsored placement delivery (feature-flagged; default OFF).
-- Connects campaign + inventory booking to safe in-app delivery RPCs.

insert into public.feature_flags (key, enabled, description)
values (
  'sponsored_placement_delivery_enabled',
  false,
  'Master kill switch for booked sponsored placement delivery. Requires mobile sponsoredPosts flag too.'
)
on conflict (key) do nothing;

-- Track last delivery events on campaign metadata (admin delivery status card).
create or replace function public.increment_ad_impression(campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.ad_campaigns c
  set impressions = c.impressions + 1,
      budget_spent = least(c.budget_spent + (c.cpm_rate / 1000.0), c.budget_total),
      metadata = coalesce(c.metadata, '{}'::jsonb) || jsonb_build_object('last_impression_at', now()),
      updated_at = now()
  where c.id = campaign_id
    and c.status = 'active'
    and c.start_date <= now()
    and c.end_date >= now()
    and c.budget_spent < c.budget_total;
end;
$$;

create or replace function public.increment_ad_click(campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.ad_campaigns c
  set clicks = c.clicks + 1,
      metadata = coalesce(c.metadata, '{}'::jsonb) || jsonb_build_object('last_click_at', now()),
      updated_at = now()
  where c.id = campaign_id
    and c.status = 'active'
    and c.start_date <= now()
    and c.end_date >= now()
    and c.budget_spent < c.budget_total;
end;
$$;

revoke execute on function public.increment_ad_impression(uuid) from anon;
revoke execute on function public.increment_ad_click(uuid) from anon;
grant execute on function public.increment_ad_impression(uuid) to authenticated;
grant execute on function public.increment_ad_click(uuid) to authenticated;

create or replace function public.is_sponsored_placement_delivery_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ff.enabled from public.feature_flags ff where ff.key = 'sponsored_placement_delivery_enabled'),
    false
  );
$$;

revoke all on function public.is_sponsored_placement_delivery_enabled() from public;
grant execute on function public.is_sponsored_placement_delivery_enabled() to authenticated;

create or replace function public.fetch_eligible_sponsored_placement(
  p_surface text,
  p_device text,
  p_slot_key text default 'in_feed_sponsored'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row record;
  v_cta_url text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if not public.is_sponsored_placement_delivery_enabled() then
    return null;
  end if;

  select
    c.id as campaign_id,
    b.id as booking_id,
    p.id as placement_id,
    c.advertiser_name,
    c.advertiser_logo,
    c.title,
    c.description,
    c.media_url,
    c.cta_label,
    c.cta_url
  into v_row
  from public.campaign_placement_bookings b
  inner join public.ad_campaigns c on c.id = b.campaign_id
  inner join public.ad_placements p on p.id = b.placement_id
  where p.key = p_slot_key
    and p.is_active = true
    and p.surface = p_surface
    and (p.device = p_device or p.device = 'all')
    and b.status in ('active', 'reserved')
    and b.start_at <= v_now
    and b.end_at >= v_now
    and c.status = 'active'
    and c.start_date <= v_now
    and c.end_date >= v_now
    and (c.budget_total <= 0 or c.budget_spent < c.budget_total)
    and coalesce(trim(c.media_url), '') <> ''
    and coalesce(trim(c.advertiser_name), '') <> ''
    and coalesce(trim(c.description), '') <> ''
    and coalesce(trim(c.title), '') <> ''
  order by b.priority desc, b.start_at asc
  limit 1;

  if not found then
    return null;
  end if;

  v_cta_url := nullif(trim(v_row.cta_url), '');
  if v_cta_url is not null then
    if v_cta_url !~* '^https?://' then
      if v_cta_url ~* '^[a-zA-Z][a-zA-Z0-9+.-]*:' then
        return null;
      end if;
      v_cta_url := 'https://' || v_cta_url;
    end if;
    if v_cta_url !~* '^https?://' then
      return null;
    end if;
  end if;

  return jsonb_build_object(
    'campaignId', v_row.campaign_id,
    'bookingId', v_row.booking_id,
    'placementId', v_row.placement_id,
    'advertiserName', v_row.advertiser_name,
    'advertiserLogo', v_row.advertiser_logo,
    'headline', v_row.title,
    'description', v_row.description,
    'mediaUrl', v_row.media_url,
    'ctaLabel', coalesce(nullif(trim(v_row.cta_label), ''), 'Learn More'),
    'ctaUrl', v_cta_url,
    'disclosureLabel', 'Sponsored'
  );
end;
$$;

comment on function public.fetch_eligible_sponsored_placement(text, text, text) is
  'Returns safe sponsored placement payload when delivery flag is on and campaign/booking/placement are eligible.';

revoke all on function public.fetch_eligible_sponsored_placement(text, text, text) from public;
grant execute on function public.fetch_eligible_sponsored_placement(text, text, text) to authenticated;
