-- 230: Pride + Juneteenth 2026 charity borders — sell through June 30, 2026 11:59 PM Eastern,
-- then retire to Pulse Shop archive (see date-gated block; mirrors migration 134 Mother''s Day pattern).

-- Last moment on shelf: June 30, 2026 11:59:59 PM America/New_York (EDT, UTC-4) = 2026-07-01 03:59:59 UTC.
-- Active catalog hides rows when expires_at <= now().

update public.shop_items
set
  description =
    'Celebrate Pride with a vibrant avatar border. For 2026, PulseVerse is donating proceeds from sales of this border to The Trevor Project (https://www.thetrevorproject.org/). The Trevor Project is the leading national organization providing crisis intervention and suicide prevention services to LGBTQ+ young people — including free, confidential counseling 24/7 via phone, chat, and text — plus resources for allies and families. Thank you for celebrating with us and supporting their work. '
    || 'Available in the Pulse Shop through June 30, 2026 at 11:59 PM Eastern. After that, this border retires permanently—you can browse it under Retired, but it will no longer be available to purchase.',
  expires_at = timestamptz '2026-07-01T03:59:59Z',
  is_limited = true,
  availability_status = 'limited',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'event_note', 'Through June 30, 2026 11:59 PM Eastern — then retires to archive',
    'catalog_retires_at_utc', '2026-07-01T03:59:59Z'
  ),
  updated_at = now()
where slug = 'border-pride-month-2026';

update public.shop_items
set
  description =
    'Celebrate freedom and solidarity with this Juneteenth avatar border. PulseVerse donates proceeds from each $1.99 purchase to School of Hip Hop (https://schoolofhiphop.net/) — a nonprofit in Phoenix, AZ that helps Black and minority youth through Hip Hop culture: DJ/production, MCing, breaking, graffiti art, and knowledge (“the fifth element”), plus music lessons, workshops, and camps that build creative skills, cultural identity, and community. '
    || 'Available in the Pulse Shop through June 30, 2026 at 11:59 PM Eastern. After that, this border retires permanently—you can browse it under Retired, but it will no longer be available to purchase.',
  expires_at = timestamptz '2026-07-01T03:59:59Z',
  is_limited = true,
  availability_status = 'limited',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'event_note', 'Through June 30, 2026 11:59 PM Eastern — then retires to archive',
    'catalog_retires_at_utc', '2026-07-01T03:59:59Z'
  ),
  updated_at = now()
where slug = 'border-juneteenth-2026-charity';

-- After the window closes: move to Retired tab (safe to apply early — runs only from July 1, 2026 04:00 UTC).
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
    'retired_note', 'June 2026 charity border — retired after June 30, 2026'
  ),
  updated_at = now()
where slug in ('border-pride-month-2026', 'border-juneteenth-2026-charity')
  and now() >= timestamptz '2026-07-01T04:00:00Z';

update public.border_collections
set
  is_retired = true,
  updated_at = now()
where slug in ('collection_pride_2026', 'collection_juneteenth_2026')
  and now() >= timestamptz '2026-07-01T04:00:00Z';
