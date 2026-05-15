-- ============================================================================
-- 140: Beta Pioneer — limited-time FREE shop claim (no App Store / Play IAP)
-- Use the same path as Mother's Day: metadata.free_in_shop + economy_claim_free_shop_border.
-- - Clears store SKUs and sets is_shop_item = false (satisfies shop_items_border_rules).
-- - expires_at: catalog + RPC reject claims after this instant (see migration 133).
--
-- Adjust the timestamp below if you extend the promo. Users who already claimed keep
-- the border; you may delete the unused IAP product in App Store Connect.
-- ============================================================================

update public.shop_items si
set
  store_product_id_ios = null,
  store_product_id_android = null,
  is_shop_item = false,
  is_earned_only = false,
  is_active = true,
  is_retired = false,
  real_money_display_price = 'Free',
  is_giftable = false,
  is_limited = true,
  availability_status = 'limited',
  unlock_method = 'direct_purchase',
  price_type = 'direct_purchase',
  source_type = 'shop',
  description =
    'Early PulseVerse beta recognition — free for everyone in the Pulse Shop for a limited time. '
    || 'Claim it in the app while this promo is live; once you unlock it, you keep it forever.',
  release_at = null,
  expires_at = timestamptz '2026-12-31T23:59:59Z',
  metadata = coalesce(si.metadata, '{}'::jsonb) || jsonb_build_object(
    'free_in_shop', true,
    'featured', false,
    'event_note', 'Free through 2026-12-31 UTC',
    'pulse_frame_slug', coalesce(nullif(trim(si.metadata->>'pulse_frame_slug'), ''), 'beta-tester-border')
  ),
  updated_at = now()
where si.slug in ('border_beta_pioneer', 'beta-pioneer');
