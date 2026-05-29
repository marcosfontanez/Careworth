-- 229: Mother's Day 2026 border → retired shop archive (browse-only in Retired drawer).
-- Not claimable or purchasable; visible to all signed-in users via metadata.retired_catalog_visible.

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
    'event_note', 'Mother''s Day 2026 — retired archive'
  ),
  updated_at = now()
where slug = 'border-mothers-day-2026';

update public.border_collections
set
  is_retired = true,
  updated_at = now()
where slug = 'collection_mothers_day_2026';

-- Allow clients to read curated retired-archive rows (not only active or owned).
drop policy if exists shop_items_read_active on public.shop_items;
create policy shop_items_read_active
  on public.shop_items for select
  to anon, authenticated
  using (
    is_active = true
    or public._economy_is_admin()
    or (
      coalesce((metadata->>'retired_catalog_visible')::boolean, false) = true
      or metadata @> '{"retired_catalog_visible": true}'::jsonb
    )
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.user_inventory ui
        where ui.shop_item_id = shop_items.id
          and ui.user_id = auth.uid()
      )
    )
  );
