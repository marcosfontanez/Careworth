-- 228: Permanently retire Neon Blue + Gold Pulse shop borders (migration 227 launch SKUs).
-- Rows kept for purchase/inventory audit; not sold or giftable again.
-- Deactivate matching Play Console products: border_neon_blue, border_gold_pulse.

update public.shop_items
set
  is_active = false,
  is_retired = true,
  availability_status = 'retired',
  is_shop_item = false,
  is_giftable = false,
  store_product_id_ios = null,
  store_product_id_android = null,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'retired_reason', 'removed_from_catalog_permanent',
    'retired_note', 'Neon Blue and Gold Pulse retired — do not re-list or reuse slugs.',
    'retired_catalog_visible', true
  ),
  updated_at = now()
where slug in ('border-neon-blue', 'border-gold-pulse');
