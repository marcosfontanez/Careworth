import type { Post } from '@/types';

export function coverAbVariant(
  post: Pick<Post, 'id' | 'thumbnailUrl' | 'coverAltUrl' | 'type'>,
): 'a' | 'b' {
  const a = post.thumbnailUrl?.trim();
  const b = post.coverAltUrl?.trim();
  if (!a || !b || post.type !== 'video') return 'a';
  let h = 0;
  for (let i = 0; i < post.id.length; i++) h = (h * 31 + post.id.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? 'a' : 'b';
}

/**
 * Stable A/B cover: same post id always picks the same variant (no jitter on scroll).
 * Variant A = primary thumbnail, B = alternate when present.
 */
export function pickAbCoverUrl(
  post: Pick<Post, 'id' | 'thumbnailUrl' | 'coverAltUrl' | 'type' | 'mediaUrl'>,
): string | undefined {
  const a = post.thumbnailUrl?.trim();
  const b = post.coverAltUrl?.trim();
  if (post.type === 'image') return a || post.mediaUrl?.trim();
  if (!a && !b) return undefined;
  if (!b) return a;
  if (!a) return b;
  let h = 0;
  for (let i = 0; i < post.id.length; i++) h = (h * 31 + post.id.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? a : b;
}
