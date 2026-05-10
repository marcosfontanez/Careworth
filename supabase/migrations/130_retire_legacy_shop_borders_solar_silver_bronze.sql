-- ============================================================================
-- 130: Retire legacy Pulse Shop borders (no longer sold)
-- Solar Crown, Silver Solstice, Bronze Horizon — keep rows for inventory/IAP audit.
-- ============================================================================

update public.shop_items
set
  is_active = false,
  is_retired = true,
  availability_status = 'retired',
  updated_at = now()
where type = 'border'
  and slug in (
    'solar-crown',
    'silver-solstice',
    'bronze-horizon'
  );
