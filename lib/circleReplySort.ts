import type { CircleReply } from '@/types';
import type { CircleReplySort } from '@/components/circles/CircleReplySortBar';

/** Shared reply sort for thread detail — keeps Helpful/Top/New behavior testable. */
export function sortCircleReplies(replies: CircleReply[], sort: CircleReplySort): CircleReply[] {
  const list = replies.map((r) => ({ ...r, helpfulCount: r.helpfulCount ?? 0 }));
  if (sort === 'new') {
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (sort === 'helpful') {
    return list.sort(
      (a, b) =>
        (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  return list.sort(
    (a, b) =>
      (b.reactionCount ?? 0) - (a.reactionCount ?? 0) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
