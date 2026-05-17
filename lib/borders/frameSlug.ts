import type { ShopItemRow } from '@/lib/shop/types';
import type { PulseAvatarRingStyle } from '@/components/profile/AvatarBuilder';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';

/**
 * Mirror of `_economy_sync_user_pulse_frame_from_shop_item` (migration 133+):
 * map a shop border to `pulse_avatar_frames.slug` for vault dedupe and equipped
 * detection across `user_inventory` + `user_pulse_avatar_frames`.
 *
 * Resolution order (aligned with SQL RPCs):
 *   1. `shop_items.metadata.pulse_frame_slug` when set
 *   2. Legacy slug fallback map for older borders
 *   3. null — no pulse-frame mirror
 */
const LEGACY_SHOP_SLUG_TO_FRAME_SLUG: Record<string, string> = {
  'border-pride-month-2026': 'pride-month-2026-border',
  'border_pride_month_2026': 'pride-month-2026-border',
  'border_beta_pioneer': 'beta-tester-border',
  'beta-pioneer': 'beta-tester-border',
  'border-mothers-day-2026': 'mothers-day-2026-border',
  'border_mothers_day_2026': 'mothers-day-2026-border',
  'border-juneteenth-2026-charity': 'juneteenth-2026-border',
  'border_juneteenth_2026_charity': 'juneteenth-2026-border',
  'border-emerald-renewal-may-2026': 'emerald-renewal-may-2026-border',
  'border_emerald_renewal_may_2026': 'emerald-renewal-may-2026-border',
};

export function resolveShopBorderFrameSlug(item: ShopItemRow): string | null {
  if (item.type !== 'border') return null;
  const shopSlug = String(item.slug ?? '').trim().toLowerCase();
  const meta = (item.metadata ?? {}) as { pulse_frame_slug?: unknown };
  const fromMeta =
    typeof meta.pulse_frame_slug === 'string' ? meta.pulse_frame_slug.trim() : '';
  if (fromMeta) return fromMeta;
  const fromMap = LEGACY_SHOP_SLUG_TO_FRAME_SLUG[shopSlug];
  return fromMap ?? null;
}

/**
 * Build a {@link PulseAvatarRingStyle} from a shop border so {@link AvatarDisplay}
 * can render the user's actual avatar inside the border art (instead of the
 * generic "person" placeholder rendered by {@link BorderPreviewPlate}).
 *
 * - When the shop item maps to a bundled raster (Pride, Beta, Mother's Day,
 *   Juneteenth, Emerald Renewal …), AvatarDisplay's raster path renders the
 *   real border PNG around the avatar.
 * - When no bundled raster exists, AvatarDisplay falls back to a colored
 *   stroke ring tinted with the rarity color — the avatar still shows.
 */
export function pulseFrameStyleForShopBorder(item: ShopItemRow): PulseAvatarRingStyle {
  const ring = ringPreviewColor(item);
  return {
    ringColor: ring,
    glowColor: ring,
    borderWidth: 3,
    ringCaption: null,
    slug: resolveShopBorderFrameSlug(item),
  };
}
