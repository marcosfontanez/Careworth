-- ============================================================================
-- 126: Paid shop borders are giftable (IAP gift path requires is_giftable).
-- Free-in-shop rows (metadata.free_in_shop) stay not giftable — no store gift SKU flow.
-- ============================================================================

update public.shop_items si
set is_giftable = true
where si.type = 'border'
  and coalesce(si.is_shop_item, false) = true
  and not (
    coalesce((si.metadata->>'free_in_shop')::boolean, false)
    or (si.metadata @> '{"free_in_shop": true}'::jsonb)
  );
