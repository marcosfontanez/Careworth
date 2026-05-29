import { Image } from 'expo-image';
import {
  CREATOR_GIFT_SLUGS,
  creatorGiftBundledSource,
  type CreatorGiftSlug,
} from '@/lib/shop/creatorGiftAssets';
import type { ShopItemRow } from '@/lib/shop/types';

const FALLBACK_SLUG: CreatorGiftSlug = 'pulse';

/** Bundled PNG art under `assets/images/shop-gifts/` — preferred over remote URLs. */
export function resolveCreatorGiftImageSource(
  item: Pick<ShopItemRow, 'slug' | 'image_url'> | null | undefined,
): number | { uri: string } {
  const bundled = creatorGiftBundledSource(item?.slug);
  if (bundled != null) return bundled;

  const remote = item?.image_url?.trim();
  if (remote) return { uri: remote };

  if (__DEV__) {
    console.warn(
      '[GiftAssetResolver] Missing bundled art for slug',
      item?.slug ?? '(unknown)',
      '— using pulse fallback.',
    );
  }
  return creatorGiftBundledSource(FALLBACK_SLUG)!;
}

export function isKnownCreatorGiftSlug(slug: string | null | undefined): slug is CreatorGiftSlug {
  const k = slug?.toLowerCase().trim() ?? '';
  return (CREATOR_GIFT_SLUGS as readonly string[]).includes(k);
}

/** Prefetch bundled art for smoother live overlay playback. */
export function prefetchCreatorGiftAsset(item: Pick<ShopItemRow, 'slug' | 'image_url'> | null | undefined): void {
  try {
    const source = resolveCreatorGiftImageSource(item);
    if (typeof source === 'number') return;
    if (source.uri) void Image.prefetch(source.uri);
  } catch {
    /* best-effort */
  }
}
