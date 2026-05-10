-- ============================================================================
-- 135: Juneteenth 2026 charity border (IAP $1.99) — School of Hip Hop
-- Preview asset: assets/images/pulse-rings/juneteenth-2026-border.png
-- Store: create matching IAP products for the SKU ids below in App Store Connect + Play Console.
-- ============================================================================

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_juneteenth_2026',
  'Juneteenth 2026',
  'Juneteenth — charity collaboration supporting School of Hip Hop.',
  'seasonal',
  '2026-juneteenth',
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
  'border-juneteenth-2026-charity',
  'border',
  'borders',
  'Juneteenth Charity Border',
  'Celebrate freedom and solidarity with this Juneteenth avatar border. PulseVerse donates proceeds from each $1.99 purchase to School of Hip Hop (https://schoolofhiphop.net/) — a nonprofit in Phoenix, AZ that helps Black and minority youth through Hip Hop culture: DJ/production, MCing, breaking, graffiti art, and knowledge (“the fifth element”), plus music lessons, workshops, and camps that build creative skills, cultural identity, and community.',
  'epic',
  'epic',
  null,
  null,
  null,
  null,
  '$1.99',
  'com.pulseverse.border.juneteenth_2026.ios',
  'com.pulseverse.border.juneteenth_2026.android',
  true,
  true,
  true,
  9,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'juneteenth-2026-border',
    'internal_item_number', 'PV-SHOP-BORDER-2026-JUNETEENTH-001',
    'internal_sku_code', 'PULSE-IAP-BORDER-JUNETEENTH-2026',
    'charity_name', 'School of Hip Hop',
    'charity_url', 'https://schoolofhiphop.net/'
  ),
  (select id from public.border_collections c where c.slug = 'collection_juneteenth_2026' limit 1),
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
  '2026-juneteenth'
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
  'juneteenth-2026-border',
  'Juneteenth 2026',
  'School of Hip Hop — youth programs in Hip Hop art, music, and culture (schoolofhiphop.net). Matches the Pulse Shop Juneteenth charity border.',
  'campaign',
  'epic',
  'Charity · Pulse Shop',
  '2026-06-01',
  '#B45309',
  'rgba(180, 83, 9, 0.4)',
  'Juneteenth 2026',
  53
)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  rarity_tier = excluded.rarity_tier,
  acquisition_tag = excluded.acquisition_tag,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption,
  sort_order = excluded.sort_order;
