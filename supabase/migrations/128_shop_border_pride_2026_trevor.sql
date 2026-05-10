-- ============================================================================
-- 128: 2026 Pride Month shop border (IAP $1.99) + pulse_avatar_frames for admin
-- Proceeds language in description; preview asset: assets/images/pulse-rings/pride-month-2026-border.png
-- Store: create matching IAP products for the SKU ids below in App Store Connect + Play Console.
-- ============================================================================

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_pride_2026',
  'Pride 2026',
  'Pride Month — charity collaboration supporting The Trevor Project.',
  'seasonal',
  '2026-pride',
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
  'border-pride-month-2026',
  'border',
  'borders',
  '2026 Pride Month Border',
  'Celebrate Pride with a vibrant avatar border. For 2026, PulseVerse is donating proceeds from sales of this border to The Trevor Project (https://www.thetrevorproject.org/). The Trevor Project is the leading national organization providing crisis intervention and suicide prevention services to LGBTQ+ young people — including free, confidential counseling 24/7 via phone, chat, and text — plus resources for allies and families. Thank you for celebrating with us and supporting their work.',
  'epic',
  'epic',
  null,
  null,
  null,
  null,
  '$1.99',
  'com.pulseverse.border.pride_month_2026.ios',
  'com.pulseverse.border.pride_month_2026.android',
  true,
  true,
  true,
  8,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'pride-month-2026-border',
    'internal_item_number', 'PV-SHOP-BORDER-2026-PRIDE-001',
    'internal_sku_code', 'PULSE-IAP-BORDER-PRIDE-2026',
    'charity_name', 'The Trevor Project',
    'charity_url', 'https://www.thetrevorproject.org/'
  ),
  (select id from public.border_collections c where c.slug = 'collection_pride_2026' limit 1),
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
  48,
  '2026-pride'
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
  month_start,
  ring_color,
  glow_color,
  ring_caption,
  sort_order
)
values (
  'pride-month-2026-border',
  '2026 Pride Month',
  'Supports The Trevor Project — crisis support for LGBTQ+ youth (trevorproject.org). Matches the Pulse Shop Pride border art.',
  'campaign',
  '2026-06-01',
  '#EC4899',
  'rgba(236, 72, 153, 0.42)',
  'Pride 2026',
  52
)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption,
  sort_order = excluded.sort_order;
