-- 227: Align shop catalog with Google Play launch in-app product IDs.
-- Android SKUs: sparks_100, sparks_500, sparks_1200 (consumable spark packs)
--               border_neon_blue, border_gold_pulse (non-consumable borders)
-- iOS placeholders use com.pulseverse.* until App Store Connect products are created.

-- Spark packs
insert into public.shop_items (
  slug, type, category, name, description, rarity,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata
)
values (
  'sparks-100', 'spark_pack', 'sparks', '100 Sparks', 'Quick top-up.',
  'common', null, 100, '$0.99',
  'com.pulseverse.sparks.100.ios',
  'sparks_100',
  true, false, false, 95, null,
  '{"play_product_type":"consumable"}'::jsonb
)
on conflict (slug) do update set
  store_product_id_android = excluded.store_product_id_android,
  store_product_id_ios = coalesce(public.shop_items.store_product_id_ios, excluded.store_product_id_ios),
  spark_amount = excluded.spark_amount,
  real_money_display_price = excluded.real_money_display_price,
  is_active = true,
  metadata = public.shop_items.metadata || excluded.metadata,
  updated_at = now();

update public.shop_items
set
  store_product_id_android = 'sparks_500',
  store_product_id_ios = coalesce(store_product_id_ios, 'com.pulseverse.sparks.500.ios'),
  metadata = coalesce(metadata, '{}'::jsonb) || '{"play_product_type":"consumable"}'::jsonb,
  updated_at = now()
where slug = 'sparks-500';

update public.shop_items
set
  store_product_id_android = 'sparks_1200',
  store_product_id_ios = coalesce(store_product_id_ios, 'com.pulseverse.sparks.1200.ios'),
  metadata = coalesce(metadata, '{}'::jsonb) || '{"play_product_type":"consumable"}'::jsonb,
  updated_at = now()
where slug = 'sparks-1200';

-- Profile borders (IAP unlocks)
insert into public.shop_items (
  slug, type, category, name, description, rarity,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata
)
values
  (
    'border-neon-blue', 'border', 'borders', 'Neon Blue', 'Electric cyan profile rim.',
    'rare', null, null, '$2.99',
    'com.pulseverse.border.neon_blue.ios',
    'border_neon_blue',
    true, true, false, 15, null,
    '{"play_product_type":"non_consumable","theme":"cyan"}'::jsonb
  ),
  (
    'border-gold-pulse', 'border', 'borders', 'Gold Pulse', 'Premium gold pulse frame.',
    'legendary', null, null, '$4.99',
    'com.pulseverse.border.gold_pulse.ios',
    'border_gold_pulse',
    true, true, false, 12, null,
    '{"play_product_type":"non_consumable","theme":"gold"}'::jsonb
  )
on conflict (slug) do update set
  store_product_id_android = excluded.store_product_id_android,
  store_product_id_ios = coalesce(public.shop_items.store_product_id_ios, excluded.store_product_id_ios),
  name = excluded.name,
  description = excluded.description,
  real_money_display_price = excluded.real_money_display_price,
  is_active = true,
  is_giftable = excluded.is_giftable,
  metadata = public.shop_items.metadata || excluded.metadata,
  updated_at = now();
