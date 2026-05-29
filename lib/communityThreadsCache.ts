import type { InfiniteData } from '@tanstack/react-query';
import type { CircleThread } from '@/types';

/** Default page size for Questions-tab thread lists. */
export const COMMUNITY_THREADS_PAGE_SIZE = 48;

export function communityThreadsNextPageParam(lastPage: CircleThread[]): string | undefined {
  if (lastPage.length < COMMUNITY_THREADS_PAGE_SIZE) return undefined;
  return lastPage[lastPage.length - 1]?.createdAt;
}

export function flattenCommunityThreadPages(
  data: InfiniteData<CircleThread[]> | undefined,
): CircleThread[] | undefined {
  if (!data) return undefined;
  const seen = new Set<string>();
  const out: CircleThread[] = [];
  for (const page of data.pages) {
    for (const thread of page) {
      if (seen.has(thread.id)) continue;
      seen.add(thread.id);
      out.push(thread);
    }
  }
  return out;
}
