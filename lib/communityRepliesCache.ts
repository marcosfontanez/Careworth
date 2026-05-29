import type { InfiniteData } from '@tanstack/react-query';
import type { CircleReply } from '@/types';

/** Default page size for thread reply lists (chronological). */
export const COMMUNITY_REPLY_PAGE_SIZE = 40;

export function communityRepliesNextPageParam(lastPage: CircleReply[]): string | undefined {
  if (lastPage.length < COMMUNITY_REPLY_PAGE_SIZE) return undefined;
  return lastPage[lastPage.length - 1]?.createdAt;
}

export function flattenCommunityReplyPages(
  data: InfiniteData<CircleReply[]> | undefined,
): CircleReply[] | undefined {
  if (!data) return undefined;
  const seen = new Set<string>();
  const out: CircleReply[] = [];
  for (const page of data.pages) {
    for (const reply of page) {
      if (seen.has(reply.id)) continue;
      seen.add(reply.id);
      out.push(reply);
    }
  }
  return out;
}
