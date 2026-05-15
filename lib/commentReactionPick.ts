import { queryClient } from '@/lib/queryClient';
import { commentKeys } from '@/lib/queryKeys';
import { emptyPostReactionCounts } from '@/lib/postReactions';
import { commentService } from '@/services/comment';
import type { Comment , PostReactionKind } from '@/types';

function mapCommentTree(nodes: Comment[], commentId: string, fn: (c: Comment) => Comment): Comment[] {
  return nodes.map((n) => {
    if (n.id === commentId) return fn(n);
    if (n.replies.length === 0) return n;
    return { ...n, replies: mapCommentTree(n.replies, commentId, fn) };
  });
}

export function optimisticCommentReactionTree(
  tree: Comment[],
  commentId: string,
  prevKind: PostReactionKind | null,
  nextKind: PostReactionKind | null,
): Comment[] {
  return mapCommentTree(tree, commentId, (c) => {
    const base = c.reactionCounts ?? emptyPostReactionCounts();
    const counts = { ...base };
    if (prevKind) counts[prevKind] = Math.max(0, (counts[prevKind] ?? 0) - 1);
    if (nextKind) counts[nextKind] = (counts[nextKind] ?? 0) + 1;
    const likeDelta = (nextKind ? 1 : 0) - (prevKind ? 1 : 0);
    return {
      ...c,
      reactionCounts: counts,
      likeCount: Math.max(0, c.likeCount + likeDelta),
      viewerReaction: nextKind,
      isLiked: nextKind === 'heart',
    };
  });
}

/**
 * Circle-wall style reaction pick: tap the same emoji again clears. Persists via {@link commentService.setCommentReaction}.
 */
export async function pickCommentReaction(args: {
  postId: string;
  viewerId: string;
  comment: Comment;
  kind: PostReactionKind;
}): Promise<void> {
  const { postId, viewerId, comment, kind } = args;
  const key = commentKeys.byPost(postId, viewerId);
  const prevKind = comment.viewerReaction ?? null;
  const nextKind = prevKind === kind ? null : kind;
  const snapshot = queryClient.getQueryData<Comment[]>(key);
  if (snapshot) {
    queryClient.setQueryData(key, optimisticCommentReactionTree(snapshot, comment.id, prevKind, nextKind));
  }
  try {
    await commentService.setCommentReaction(comment.id, nextKind);
  } catch (e) {
    if (snapshot) queryClient.setQueryData(key, snapshot);
    throw e;
  }
}
