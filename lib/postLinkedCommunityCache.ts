import type { Post } from '@/types';
import { queryClient } from '@/lib/queryClient';
import type { LinkedCommunityMeta } from '@/lib/postLinkedCommunityMeta';

function isPost(value: unknown): value is Post {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in (value as Record<string, unknown>) &&
    typeof (value as { id: unknown }).id === 'string'
  );
}

function patchOne(post: Post, postId: string, meta: LinkedCommunityMeta): Post | null {
  if (post.id !== postId) return null;
  const name = meta.name?.trim();
  const slug = meta.slug?.trim();
  if (!name && !slug) return null;
  return {
    ...post,
    ...(name ? { linkedCommunityName: name } : {}),
    ...(slug ? { linkedCommunitySlug: slug } : {}),
  };
}

/** Patch linked Circle label fields wherever the post lives in React Query cache. */
export function patchPostLinkedCommunityMeta(postId: string, meta: LinkedCommunityMeta): void {
  if (!postId) return;
  const name = meta.name?.trim();
  const slug = meta.slug?.trim();
  if (!name && !slug) return;

  try {
    const cache = queryClient.getQueryCache();
    for (const query of cache.getAll()) {
      const data = query.state.data as unknown;
      if (data == null) continue;

      if (Array.isArray(data)) {
        let changed = false;
        const next = data.map((entry) => {
          if (!isPost(entry) || entry.id !== postId) return entry;
          const patched = patchOne(entry, postId, meta);
          if (patched) changed = true;
          return patched ?? entry;
        });
        if (changed) queryClient.setQueryData(query.queryKey, next);
        continue;
      }

      if (isPost(data) && data.id === postId) {
        const patched = patchOne(data, postId, meta);
        if (patched) queryClient.setQueryData(query.queryKey, patched);
        continue;
      }

      if (
        typeof data === 'object' &&
        data !== null &&
        'pages' in (data as Record<string, unknown>) &&
        Array.isArray((data as { pages: unknown }).pages)
      ) {
        const inf = data as { pages: { posts?: unknown }[]; pageParams: unknown[] };
        let changed = false;
        const newPages = inf.pages.map((page) => {
          if (!page || !Array.isArray((page as { posts?: unknown }).posts)) {
            return page;
          }
          const posts = (page as { posts: unknown[] }).posts;
          let pageChanged = false;
          const newPosts = posts.map((p) => {
            if (!isPost(p) || p.id !== postId) return p;
            const patched = patchOne(p, postId, meta);
            if (patched) {
              pageChanged = true;
              return patched;
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
    /* best-effort */
  }
}
