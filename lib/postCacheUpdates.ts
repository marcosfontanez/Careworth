/**
 * Optimistic in-place updates for cached Post objects across React Query.
 *
 * Why this exists:
 *   The feed deliberately does NOT invalidate ['feed'] / ['feedInf'] on like /
 *   save / share, because invalidation forces a refetch -> the posts array
 *   reference swaps -> every cell re-renders -> on Android the active video
 *   surface flashes / shifts. (See the long comment in app/(tabs)/feed.tsx
 *   `toggleLike` for context.)
 *
 *   The trade-off was that the action icon flipped instantly via local state
 *   (likedPosts / savedPostIds Zustand sets) but the *count* shown next to the
 *   icon stayed frozen at whatever the server returned on initial load. Brand
 *   new posts therefore showed "0" forever even after the user just tapped
 *   save / like / share, which looked broken.
 *
 *   This helper closes that gap by walking every cached query and patching the
 *   matching Post objects in place. No refetch -> no video flash, but the
 *   number next to the icon now ticks the moment the user taps.
 *
 * Cache shapes covered (everything we currently put posts into):
 *   - `Post[]` ............... useFeed, useCommunityPosts, etc.
 *   - `Post` ................. usePost (single post)
 *   - `{ pages: [{ posts: Post[], ... }], pageParams }` ...... useFeedInfinite
 *
 * Anything else is ignored -- safe by construction.
 */

import { queryClient } from '@/lib/queryClient';
import type { Post } from '@/types';

export type PostCountField =
  | 'likeCount'
  | 'commentCount'
  | 'shareCount'
  | 'saveCount';

function bumpOne(post: Post, field: PostCountField, delta: number): Post {
  const current = (post[field] as number | undefined) ?? 0;
  return { ...post, [field]: Math.max(0, current + delta) };
}

function isPost(value: unknown): value is Post {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in (value as Record<string, unknown>) &&
    typeof (value as { id: unknown }).id === 'string'
  );
}

/**
 * Apply a +/- delta to one count field on a specific post wherever it lives in
 * the React Query cache. Safe to call from anywhere -- uses the singleton
 * queryClient and never throws.
 */
export function bumpPostCount(
  postId: string,
  field: PostCountField,
  delta: number,
): void {
  if (!postId || delta === 0) return;

  try {
    const cache = queryClient.getQueryCache();
    for (const query of cache.getAll()) {
      const data = query.state.data as unknown;
      if (data == null) continue;

      // Plain Post[] shape (useFeed / useCommunityPosts / similar).
      if (Array.isArray(data)) {
        let changed = false;
        const next = data.map((entry) => {
          if (isPost(entry) && entry.id === postId) {
            changed = true;
            return bumpOne(entry, field, delta);
          }
          return entry;
        });
        if (changed) queryClient.setQueryData(query.queryKey, next);
        continue;
      }

      // Single Post shape (usePost).
      if (isPost(data) && data.id === postId) {
        queryClient.setQueryData(query.queryKey, bumpOne(data, field, delta));
        continue;
      }

      // Infinite query shape: { pages: [{ posts: Post[], ... }], pageParams }.
      if (
        typeof data === 'object' &&
        data !== null &&
        'pages' in (data as Record<string, unknown>) &&
        Array.isArray((data as { pages: unknown }).pages)
      ) {
        const inf = data as {
          pages: Array<{ posts?: unknown }>;
          pageParams: unknown[];
        };
        let changed = false;
        const newPages = inf.pages.map((page) => {
          if (!page || !Array.isArray((page as { posts?: unknown }).posts)) {
            return page;
          }
          const posts = (page as { posts: unknown[] }).posts;
          let pageChanged = false;
          const newPosts = posts.map((p) => {
            if (isPost(p) && p.id === postId) {
              pageChanged = true;
              return bumpOne(p, field, delta);
            }
            return p;
          });
          if (pageChanged) {
            changed = true;
            return { ...(page as object), posts: newPosts };
          }
          return page;
        });
        if (changed) {
          queryClient.setQueryData(query.queryKey, { ...inf, pages: newPages });
        }
      }
    }
  } catch {
    /* Cache patch is best-effort; never throw from a UI handler. */
  }
}
