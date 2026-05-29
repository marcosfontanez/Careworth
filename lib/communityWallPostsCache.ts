import type { InfiniteData } from '@tanstack/react-query';
import type { Post } from '@/types';

/** Default page size for circle wall fetches (matches `postsService.getByCommunity`). */
export const COMMUNITY_WALL_PAGE_SIZE = 48;

export function communityWallNextPageParam(lastPage: Post[]): string | undefined {
  if (lastPage.length < COMMUNITY_WALL_PAGE_SIZE) return undefined;
  return lastPage[lastPage.length - 1]?.createdAt;
}

export function flattenCommunityWallPages(
  data: InfiniteData<Post[]> | undefined,
): Post[] | undefined {
  if (!data) return undefined;
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const page of data.pages) {
    for (const post of page) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
  }
  return out;
}

export function patchCommunityWallPostsInCache(
  old: InfiniteData<Post[]> | undefined,
  patch: (posts: Post[]) => Post[],
): InfiniteData<Post[]> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => patch(page)),
  };
}
