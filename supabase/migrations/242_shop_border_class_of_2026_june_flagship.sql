-- ============================================================================
-- 242: June 2026 flagship Pulse Shop border — "Class of 2026" (graduation)
--
-- This is June's premium FEATURED border. It replaces Emerald Renewal (May), which
-- retires June 1, 2026 via migration 231 (auto-fires at 2026-06-01 04:00 UTC →
-- moves to the Retired tab, browse-only, no purchase/claim). Apply 231 + 242 in order.
--
-- Visual: animated graduation frame — gold cap + tassel, "CLASS OF 2026" plaque,
-- purple/teal gems, ECG pulse accents. Static PNG + performant animated overlay
-- (components/profile/PremiumAnimatedProfileBorder.tsx). visual_tier = 'animated'.
--
-- Asset: assets/images/pulse-rings/class-of-2026-border.png (replace placeholder
--        art with final production PNG at the same path before launch).
-- Store: create IAP products matching the SKU ids below (App Store Connect + Play).
-- ============================================================================

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_class_of_2026_june_2026',
  'Class of 2026 — June 2026',
  'Flagship Pulse Shop graduation frame for June — a triumphant Class of 2026 celebration.',
  'seasonal',
  '2026-06-class',
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
  'border-class-of-2026',
  'border',
  'borders',
  'Class of 2026',
  'Cap off the season with June’s flagship frame: a grand Class of 2026 celebration. A confetti explosion bursts from the graduation cap, gold trim catches the light, gemstones flash, and the pulse line glows with energy around your photo. A collectible graduation moment for everyone marking a milestone this year. Thank you for supporting PulseVerse’s continued growth.',
  'legendary',
  'legendary',
  null,
  null,
  null,
  null,
  '$4.99',
  'com.pulseverse.border.class_of_2026.ios',
  'com.pulseverse.border.class_of_2026.android',
  true,
  true,
  true,
  1,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'class-of-2026-border',
    'featured', true,
    'ring_color', '#F5C518',
    'preview_ring_color', '#FFD54A',
    'internal_item_number', 'PV-SHOP-BORDER-2026-CLASS-OF-2026-JUNE-001',
    'internal_sku_code', 'PULSE-IAP-BORDER-CLASS-OF-2026-JUNE-2026'
  ),
  (select id from public.border_collections c where c.slug = 'collection_class_of_2026_june_2026' limit 1),
  'shop',
  'animated',
  'limited',
  'direct_purchase',
  true,
  true,
  true,
  false,
  'direct_purchase',
  false,
  80,
  '2026-06-class'
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
  'class-of-2026-border',
  'Class of 2026',
  'Flagship June 2026 shop frame — a triumphant graduation celebration. Matches Pulse Shop Class of 2026 border art.',
  'exclusive',
  'legendary',
  'Premium · Pulse Shop · June 2026',
  '2026-06-01',
  '#F5C518',
  'rgba(245, 197, 24, 0.45)',
  'Class of 2026',
  50
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

-- Emerald Renewal: ensure it is no longer the featured strip item (231 also
-- retires it after June 1; this is safe + idempotent if applied before/after).
update public.shop_items si
set
  metadata = coalesce(si.metadata, '{}'::jsonb) || jsonb_build_object('featured', false),
  sort_order = greatest(coalesce(si.sort_order, 99), 20),
  updated_at = now()
where si.slug = 'border-emerald-renewal-may-2026';

-- NOTE: economy_equip_border already maps via metadata.pulse_frame_slug
-- ('class-of-2026-border' set above), so no RPC change is required to equip.
