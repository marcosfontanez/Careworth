-- ============================================================================
-- 134: Retire Mother's Day 2026 shop listing after the free-claim window.
-- Catalog is already hidden in-app once expires_at <= now (migration 133).
-- This migration is safe to apply early: the update runs only after 2026-05-24 UTC.
-- ============================================================================

update public.shop_items
set
  is_active = false,
  is_retired = true,
  availability_status = 'retired',
  updated_at = now()
where slug = 'border-mothers-day-2026'
  and now() >= timestamptz '2026-05-24T00:00:00Z';
