import type { Post } from '@/types';

/** DB row shape from `community_post_pins`. */
export type CommunityPostPinRow = { post_id: string; sort_order: number };

/**
 * Place pinned posts first (stable admin `sort_order`), then the remaining
 * posts in their original list order (typically `created_at` desc).
 */
export function mergePinnedCommunityPosts(posts: Post[], pins: CommunityPostPinRow[]): Post[] {
  if (!pins.length) return posts;
  const byId = new Map(posts.map((p) => [p.id, p]));
  const pinned: Post[] = [];
  const seenPinIds = new Set<string>();
  const orderedPins = [...pins].sort((a, b) => a.sort_order - b.sort_order);
  for (const row of orderedPins) {
    const post = byId.get(row.post_id);
    if (post && !seenPinIds.has(post.id)) {
      pinned.push(post);
      seenPinIds.add(post.id);
    }
  }
  const rest = posts.filter((p) => !seenPinIds.has(p.id));
  return [...pinned, ...rest];
}
