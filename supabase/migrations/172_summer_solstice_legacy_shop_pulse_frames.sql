-- ============================================================================
-- 172: Summer Solstice legacy IAP borders — pulse_avatar_frames, shop metadata,
-- user_pulse_avatar_frames backfill, equip + inventory-sync slug fallbacks.
-- App: lib/pulseRingRasterAssets.ts + lib/borders/frameSlug.ts.
-- ============================================================================

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_summer_solstice_legacy_iap',
  'Summer Solstice — Legacy shop',
  'Solar Crown, Silver Solstice, and Bronze Horizon — Summer Solstice metal art. Retired storefront SKUs; inventory and gifts remain.',
  'seasonal',
  '2026-summer-solstice-legacy',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  season_code = excluded.season_code,
  is_retired = excluded.is_retired,
  updated_at = now();

insert into public.pulse_avatar_frames (
  slug,
  label,
  subtitle,
  prize_tier,
  rarity_tier,
  acquisition_tag,
  month_start,
  ring_color,
  glow_color,
  ring_caption,
  sort_order
)
values
  (
    'summer-solstice-2026-gold-border',
    'Solar Crown',
    'Summer Solstice collection — gold metal rim (legacy Pulse Shop IAP). Matches bundled summer-solstice-2026-gold art.',
    'campaign',
    'legendary',
    'Summer Solstice · Legacy shop',
    '2026-06-01',
    '#FBBF24',
    'rgba(251, 191, 36, 0.42)',
    'Solstice · Gold',
    41
  ),
  (
    'summer-solstice-2026-silver-border',
    'Silver Solstice',
    'Summer Solstice collection — silver metal rim (legacy Pulse Shop IAP). Matches bundled summer-solstice-2026-silver art.',
    'campaign',
    'epic',
    'Summer Solstice · Legacy shop',
    '2026-06-01',
    '#94A3B8',
    'rgba(56, 189, 248, 0.38)',
    'Solstice · Silver',
    42
  ),
  (
    'summer-solstice-2026-bronze-border',
    'Bronze Horizon',
    'Summer Solstice collection — bronze metal rim (legacy Pulse Shop IAP). Matches bundled summer-solstice-2026-bronze art.',
    'campaign',
    'rare',
    'Summer Solstice · Legacy shop',
    '2026-06-01',
    '#D97706',
    'rgba(217, 119, 6, 0.38)',
    'Solstice · Bronze',
    43
  )
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  rarity_tier = excluded.rarity_tier,
  acquisition_tag = excluded.acquisition_tag,
  month_start = excluded.month_start,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption,
  sort_order = excluded.sort_order;

update public.shop_items si
set
  metadata = coalesce(si.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'pulse_frame_slug',
      case lower(si.slug)
        when 'solar-crown' then 'summer-solstice-2026-gold-border'
        when 'silver-solstice' then 'summer-solstice-2026-silver-border'
        when 'bronze-horizon' then 'summer-solstice-2026-bronze-border'
      end
    ),
  collection_id = (select c.id from public.border_collections c where c.slug = 'collection_summer_solstice_legacy_iap' limit 1),
  updated_at = now()
where si.type = 'border'
  and si.slug in ('solar-crown', 'silver-solstice', 'bronze-horizon');

-- Owners who received borders before pulse_frame_slug existed: grant synced pulse frames.
insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
select distinct ui.user_id, paf.id, 0, 'shop'
from public.user_inventory ui
join public.shop_items si on si.id = ui.shop_item_id
join public.pulse_avatar_frames paf
  on paf.slug = nullif(trim(si.metadata->>'pulse_frame_slug'), '')
where ui.item_kind = 'border'
  and si.slug in ('solar-crown', 'silver-solstice', 'bronze-horizon')
on conflict (user_id, frame_id) do nothing;

create or replace function public._economy_sync_user_pulse_frame_from_shop_item(
  p_user_id uuid,
  p_shop_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_shop_slug text;
  v_slug text;
  v_frame_id uuid;
begin
  if p_user_id is null or p_shop_item_id is null then
    return;
  end if;

  select si.metadata, si.slug
  into v_meta, v_shop_slug
  from public.shop_items si
  where si.id = p_shop_item_id
  limit 1;

  if not found then
    return;
  end if;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');

  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(v_shop_slug)
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      when 'solar-crown' then 'summer-solstice-2026-gold-border'
      when 'silver-solstice' then 'summer-solstice-2026-silver-border'
      when 'bronze-horizon' then 'summer-solstice-2026-bronze-border'
      else null
    end;
  end if;

  if v_slug is null then
    return;
  end if;

  select paf.id
  into v_frame_id
  from public.pulse_avatar_frames paf
  where paf.slug = v_slug
  limit 1;

  if v_frame_id is null then
    return;
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
  values (p_user_id, v_frame_id, 0, 'shop')
  on conflict (user_id, frame_id) do nothing;
end;
$$;

comment on function public._economy_sync_user_pulse_frame_from_shop_item(uuid, uuid) is
  'Ensures user_pulse_avatar_frames has a row for shop borders with metadata.pulse_frame_slug (or known shop slug map).';

create or replace function public.economy_equip_border(p_inventory_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_item uuid;
  si_type text;
  v_shop_slug text;
  v_meta jsonb;
  v_slug text;
  v_frame_id uuid;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select ui.user_id, ui.shop_item_id
  into v_user, v_item
  from public.user_inventory ui
  where ui.id = p_inventory_item_id
  for update;

  if not found or v_user is distinct from v_uid then
    raise exception 'not_allowed';
  end if;

  select type into si_type from public.shop_items where id = v_item;
  if si_type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  update public.user_inventory
  set is_equipped = false
  where user_id = v_uid and item_kind = 'border';

  update public.user_inventory
  set is_equipped = true
  where id = p_inventory_item_id and user_id = v_uid;

  select si.slug, si.metadata
  into v_shop_slug, v_meta
  from public.shop_items si
  where si.id = v_item;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');

  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(v_shop_slug)
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-emerald-renewal-may-2026' then 'emerald-renewal-may-2026-border'
      when 'border_emerald_renewal_may_2026' then 'emerald-renewal-may-2026-border'
      when 'solar-crown' then 'summer-solstice-2026-gold-border'
      when 'silver-solstice' then 'summer-solstice-2026-silver-border'
      when 'bronze-horizon' then 'summer-solstice-2026-bronze-border'
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    if v_frame_id is not null then
      update public.profiles
      set selected_pulse_avatar_frame_id = v_frame_id
      where id = v_uid;
    end if;
  end if;
end;
$$;

comment on function public.economy_equip_border(uuid) is
  'Equips one shop border in user_inventory and mirrors to profiles.selected_pulse_avatar_frame_id when a matching pulse_avatar_frames.slug exists.';
