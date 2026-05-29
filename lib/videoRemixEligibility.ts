import type { Post } from '@/types';

/** Shared remix/clip eligibility — no React Native imports (safe for unit tests). */
export function isRemixEligibleVideoPost(
  post: Pick<Post, 'type' | 'isAnonymous' | 'mediaUrl' | 'thumbnailUrl'>,
): boolean {
  if (post.isAnonymous) return false;
  if (post.type !== 'video') return false;
  return Boolean(post.mediaUrl?.trim() || post.thumbnailUrl?.trim());
}
