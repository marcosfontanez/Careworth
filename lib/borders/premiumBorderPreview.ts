import { shopItemIsClassOf2026, shopItemIsEmeraldRenewalMay2026 } from '@/lib/pulseRingRasterAssets';
import { resolveShopBorderFrameSlug } from '@/lib/borders/frameSlug';
import { isClassOf2026FrameSlug } from '@/lib/borders/premiumBorderConfig';
import type { BorderRenderPriority, BorderVisualMode } from '@/lib/borders/borderPerformanceTypes';
import { isHeroBorderRenderPriority } from '@/lib/borders/borderPerformanceTypes';
import type { ShopItemRow } from '@/lib/shop/types';
import type { PulseAvatarFrame } from '@/types';

/** Frames with authored full-motion stacks in Customize (keep in sync with catalog). */
const CUSTOMIZE_FULL_PREVIEW_FRAME_SLUGS = new Set(['emerald-renewal-may-2026-border']);

/** Slugs that use {@link PremiumBorderOverlay} (full celebration stack). */
export function isPremiumAnimatedBorderSlug(slug: string | null | undefined): boolean {
  return isClassOf2026FrameSlug(slug);
}

export function shopItemUsesPremiumAnimatedOverlay(item: ShopItemRow | null | undefined): boolean {
  if (!item || item.type !== 'border') return false;
  return isPremiumAnimatedBorderSlug(resolveShopBorderFrameSlug(item));
}

/** Surfaces where premium borders should play at authored density (not throttled). */
export function isPremiumHeroRenderPriority(priority: BorderRenderPriority | undefined): boolean {
  return isHeroBorderRenderPriority(priority);
}

/** Customize → Look border strip / detail: full motion for flagship & animated inventory. */
export function borderDeservesCustomizeFullPreview(input: {
  slug?: string | null;
  prizeTier?: string | null;
  visualTier?: string | null;
  isAnimated?: boolean | null;
}): boolean {
  const slug = String(input.slug ?? '').trim().toLowerCase();
  if (isPremiumAnimatedBorderSlug(slug)) return true;
  if (CUSTOMIZE_FULL_PREVIEW_FRAME_SLUGS.has(slug)) return true;
  const tier = String(input.prizeTier ?? '').toLowerCase();
  if (tier === 'gold' || tier === 'silver' || tier === 'bronze') return true;
  const visual = String(input.visualTier ?? '').toLowerCase();
  if (visual === 'animated' || visual === 'reactive') return true;
  if (input.isAnimated === true) return true;
  return false;
}

export function shopBorderDeservesCustomizeFullPreview(item: ShopItemRow): boolean {
  return borderDeservesCustomizeFullPreview({
    slug: resolveShopBorderFrameSlug(item),
    visualTier: item.visual_tier,
    isAnimated: item.is_animated,
  });
}

/** Any owned shop border that should animate in Customize → Borders collection. */
export function shopBorderShowsMotionInCustomize(item: ShopItemRow): boolean {
  if (shopItemIsClassOf2026(item) || shopItemIsEmeraldRenewalMay2026(item)) return true;
  return shopBorderDeservesCustomizeFullPreview(item);
}

export function pulseFrameDeservesCustomizeFullPreview(frame: PulseAvatarFrame): boolean {
  return borderDeservesCustomizeFullPreview({
    slug: frame.slug,
    prizeTier: frame.prizeTier,
  });
}

export function customizeBorderRenderPriority(fullPreview: boolean): BorderRenderPriority {
  return fullPreview ? 'customize-border' : 'shop-grid';
}

export function shouldUsePremiumOverlayFullPreview(input: {
  slug?: string | null;
  priority?: BorderRenderPriority;
  visualMode: BorderVisualMode;
}): boolean {
  if (!isPremiumAnimatedBorderSlug(input.slug)) return false;
  if (input.visualMode !== 'full') return false;
  return isHeroBorderRenderPriority(input.priority);
}
