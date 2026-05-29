-- 231: Emerald Renewal May 2026 flagship border — sell through May 31, 2026 11:59 PM Eastern,
-- then retire to Pulse Shop archive (browse-only in Retired drawer).

-- Last moment on shelf: May 31, 2026 11:59:59 PM America/New_York (EDT, UTC-4) = 2026-06-01 03:59:59 UTC.

update public.shop_items
set
  description =
    'This month''s premium frame is cast in emerald — a symbol of renewal and the revival of the seasons. Gold vines, gemstone blooms, and a living pulse line wrap your photo in May''s energy: spring waking up, light returning, and growth ahead. A flagship Pulse Shop border for everyone who wants their avatar to feel renewed. Thank you for supporting PulseVerse''s continued growth. '
    || 'Available in the Pulse Shop through May 31, 2026 at 11:59 PM Eastern. After that, this border retires permanently—you can browse it under Retired, but it will no longer be available to purchase.',
  expires_at = timestamptz '2026-06-01T03:59:59Z',
  is_limited = true,
  availability_status = 'limited',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'event_note', 'Through May 31, 2026 11:59 PM Eastern — then retires to archive',
    'catalog_retires_at_utc', '2026-06-01T03:59:59Z'
  ),
  updated_at = now()
where slug = 'border-emerald-renewal-may-2026';

-- After the window closes: move to Retired tab (safe to apply early — runs only from June 1, 2026 04:00 UTC).
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
    'retired_catalog_visible', true,
    'retired_reason', 'seasonal_window_ended',
    'retired_note', 'May 2026 flagship border — retired after May 31, 2026'
  ),
  updated_at = now()
where slug = 'border-emerald-renewal-may-2026'
  and now() >= timestamptz '2026-06-01T04:00:00Z';

update public.border_collections
set
  is_retired = true,
  updated_at = now()
where slug = 'collection_emerald_renewal_may_2026'
  and now() >= timestamptz '2026-06-01T04:00:00Z';
