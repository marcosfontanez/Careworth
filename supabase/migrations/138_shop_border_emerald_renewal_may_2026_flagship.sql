-- ============================================================================
-- 138: May 2026 flagship Pulse Shop border — Emerald Renewal ($4.99, legendary)
-- Premium frame for May: renewal & revival of the seasons (emerald / gold art).
-- Beta Pioneer: no longer featured — remains free-in-shop in the browse grid.
-- Store: create IAP products matching the SKU ids below (App Store Connect + Play Console).
-- Asset: assets/images/pulse-rings/emerald-renewal-may-2026-border.png
-- ============================================================================

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_emerald_renewal_may_2026',
  'Emerald Renewal — May 2026',
  'Flagship Pulse Shop frame for May — emerald symbolizes renewal and the revival of the seasons.',
  'seasonal',
  '2026-05-emerald',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  season_code = excluded.season_code,
  updated_at = now();

insert into public.shop_items (
  slug, type, category, name, description, rarity, rarity_tier,
  image_url, animation_url,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata,
  collection_id, source_type, visual_tier, availability_status, unlock_method,
  is_animated, is_tradable, is_shop_item, is_earned_only, price_type,
  is_retired, prestige_score, season_code
)
values (
  'border-emerald-renewal-may-2026',
  'border',
  'borders',
  'Emerald Renewal — May 2026',
  'This month’s premium frame is cast in emerald — a symbol of renewal and the revival of the seasons. Gold vines, gemstone blooms, and a living pulse line wrap your photo in May’s energy: spring waking up, light returning, and growth ahead. A flagship Pulse Shop border for everyone who wants their avatar to feel renewed. Thank you for supporting PulseVerse’s continued growth.',
  'legendary',
  'legendary',
  null,
  null,
  null,
  null,
  '$4.99',
  'com.pulseverse.border.emerald_renewal_may_2026.ios',
  'com.pulseverse.border.emerald_renewal_may_2026.android',
  true,
  true,
  true,
  1,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'emerald-renewal-may-2026-border',
    'featured', true,
    'ring_color', '#059669',
    'preview_ring_color', '#34D399',
    'internal_item_number', 'PV-SHOP-BORDER-2026-EMERALD-RENEWAL-MAY-001',
    'internal_sku_code', 'PULSE-IAP-BORDER-EMERALD-RENEWAL-MAY-2026'
  ),
  (select id from public.border_collections c where c.slug = 'collection_emerald_renewal_may_2026' limit 1),
  'shop',
  'enhanced',
  'limited',
  'direct_purchase',
  false,
  true,
  true,
  false,
  'direct_purchase',
  false,
  72,
  '2026-05-emerald'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  rarity_tier = excluded.rarity_tier,
  real_money_display_price = excluded.real_money_display_price,
  store_product_id_ios = excluded.store_product_id_ios,
  store_product_id_android = excluded.store_product_id_android,
  is_active = excluded.is_active,
  is_giftable = excluded.is_giftable,
  is_limited = excluded.is_limited,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  collection_id = excluded.collection_id,
  source_type = excluded.source_type,
  visual_tier = excluded.visual_tier,
  availability_status = excluded.availability_status,
  unlock_method = excluded.unlock_method,
  is_animated = excluded.is_animated,
  is_tradable = excluded.is_tradable,
  is_shop_item = excluded.is_shop_item,
  is_earned_only = excluded.is_earned_only,
  price_type = excluded.price_type,
  is_retired = excluded.is_retired,
  prestige_score = excluded.prestige_score,
  season_code = excluded.season_code,
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
values (
  'emerald-renewal-may-2026-border',
  'Emerald Renewal — May 2026',
  'Flagship May 2026 shop frame — renewal & revival of the seasons. Matches Pulse Shop Emerald Renewal border art.',
  'exclusive',
  'legendary',
  'Premium · Pulse Shop · May 2026',
  '2026-05-01',
  '#059669',
  'rgba(5, 150, 105, 0.45)',
  'Renewal · May 2026',
  49
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

-- Beta Pioneer: featured strip → regular browse (still metadata.free_in_shop)
update public.shop_items si
set
  metadata = coalesce(si.metadata, '{}'::jsonb) || jsonb_build_object('featured', false),
  sort_order = greatest(coalesce(si.sort_order, 99), 22),
  updated_at = now()
where si.slug = 'border_beta_pioneer';

-- Equip RPC: map new shop slug if metadata ever missing pulse_frame_slug
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
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    update public.profiles
    set selected_pulse_avatar_frame_id = v_frame_id
    where id = v_uid;
  end if;
end;
$$;

comment on function public.economy_equip_border(uuid) is
  'Equips one shop border in user_inventory and mirrors to profiles.selected_pulse_avatar_frame_id when a matching pulse_avatar_frames.slug exists.';
