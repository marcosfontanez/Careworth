import type { ShopItemRow } from '@/lib/shop/types';

/**
 * Mirror of the SQL trigger `_economy_sync_user_pulse_frame_from_shop_item`
 * (migration 133): map a shop border to the slug of its synced pulse-avatar
 * frame so the client can dedupe vault rows and resolve "equipped" state
 * across the two storage tables (`user_inventory` + `user_pulse_avatar_frames`).
 *
 * Why this is needed on the client:
 *   When a user owns a shop border that has a synced pulse-frame counterpart,
 *   the Border Vault used to render *both* representations side-by-side, which
 *   read as a duplicate to the user. Dedupe + cross-source equipped detection
 *   both need a single key — `pulse_avatar_frames.slug` is the column the SQL
 *   join uses, so we use the same here.
 *
 * Resolution order (must match the SQL trigger to stay in sync):
 *   1. `shop_items.metadata.pulse_frame_slug`  (set by recent migrations)
 *   2. legacy fallback map for early shop borders that pre-date that field
 *   3. null — this border has no pulse-frame mirror, no dedupe needed
 */
const LEGACY_SHOP_SLUG_TO_FRAME_SLUG: Record<string, string> = {
  'border-pride-month-2026': 'pride-month-2026-border',
  'border_pride_month_2026': 'pride-month-2026-border',
  'border_beta_pioneer': 'beta-tester-border',
  'beta-pioneer': 'beta-tester-border',
  'border-mothers-day-2026': 'mothers-day-2026-border',
  'border_mothers_day_2026': 'mothers-day-2026-border',
};

export function resolveShopBorderFrameSlug(item: ShopItemRow): string | null {
  if (item.type !== 'border') return null;
  const meta = (item.metadata ?? {}) as { pulse_frame_slug?: unknown };
  const fromMeta =
    typeof meta.pulse_frame_slug === 'string' ? meta.pulse_frame_slug.trim() : '';
  if (fromMeta) return fromMeta;
  const fromMap = LEGACY_SHOP_SLUG_TO_FRAME_SLUG[String(item.slug ?? '').toLowerCase()];
  return fromMap ?? null;
}
