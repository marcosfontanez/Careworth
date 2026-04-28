import type { Post } from '@/types';

/** Known placeholder / Lorem hosts used in seeds and old demos — hide from production grids. */
export function isDemoCatalogMediaUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  const u = url.toLowerCase();
  return (
    u.includes('picsum.photos') ||
    u.includes('placehold.co') ||
    u.includes('placeholder.com') ||
    u.includes('loremflickr.com') ||
    u.includes('dummyimage.com') ||
    u.includes('fakeimg.pl') ||
    u.includes('via.placeholder')
  );
}

export function postHasDemoCatalogMedia(p: Post): boolean {
  return isDemoCatalogMediaUrl(p.thumbnailUrl) || isDemoCatalogMediaUrl(p.mediaUrl);
}

/**
 * URI suitable for a static `Image` preview (thumbnail or obvious image media).
 * Does not return video URLs — those need {@link components/mypage/RecentMediaThumb} or a player.
 */
export function postStaticImagePreviewUri(p: Post): string | undefined {
  const t = p.thumbnailUrl?.trim();
  if (t && !isDemoCatalogMediaUrl(t)) return t;
  const m = p.mediaUrl?.trim();
  if (m && !isDemoCatalogMediaUrl(m) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(m)) return m;
  return undefined;
}
