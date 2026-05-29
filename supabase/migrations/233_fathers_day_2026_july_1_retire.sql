-- 233: Father's Day 2026 free border — retire after June 30, 2026 11:59 PM Eastern.

update public.shop_items
set
  is_active = false,
  is_retired = true,
  availability_status = 'retired',
  is_shop_item = false,
  is_giftable = false,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'retired_catalog_visible', true,
    'free_in_shop', false,
    'retired_reason', 'event_window_ended',
    'retired_note', 'Father''s Day 2026 — retired after June 30, 2026',
    'event_note', 'Father''s Day 2026 — retired archive'
  ),
  updated_at = now()
where slug = 'border-fathers-day-2026'
  and now() >= timestamptz '2026-07-01T04:00:00Z';

update public.border_collections
set
  is_retired = true,
  updated_at = now()
where slug = 'collection_fathers_day_2026'
  and now() >= timestamptz '2026-07-01T04:00:00Z';
