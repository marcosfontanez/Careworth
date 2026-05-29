import { anonymousNameOnPost } from '@/lib/anonymousCircle';
import { ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import type { Comment, CreatorSummary } from '@/types';

function anonymousCommentAuthor(postId: string, realAuthorId: string): CreatorSummary {
  return {
    id: ANONYMOUS_PUBLIC_CREATOR_ID,
    displayName: anonymousNameOnPost(realAuthorId, postId),
    avatarUrl: '',
    role: '',
    specialty: '',
    city: '',
    state: '',
    isVerified: false,
  };
}

function redactCommentNode(
  comment: Comment,
  postId: string,
  realAuthorId: string,
  viewerId?: string | null,
): Comment {
  if (comment.author.id === ANONYMOUS_PUBLIC_CREATOR_ID) return comment;
  if (viewerId && viewerId === realAuthorId) return comment;

  return {
    ...comment,
    author: anonymousCommentAuthor(postId, realAuthorId),
  };
}

/**
 * App-layer belt on {@link comments_viewer_safe}. Pass `realAuthorIds` keyed by
 * comment id when the wire row still carried real ids (legacy paths).
 */
export function finalizeCommentsForViewer(
  comments: Comment[],
  postId: string,
  opts?: { isAnonymous?: boolean; viewerId?: string | null; realAuthorIds?: Map<string, string> },
): Comment[] {
  if (!opts?.isAnonymous) return comments;

  const walk = (nodes: Comment[]): Comment[] =>
    nodes.map((c) => {
      const realId = opts.realAuthorIds?.get(c.id) ?? c.author.id;
      const redacted = redactCommentNode(c, postId, realId, opts.viewerId);
      return {
        ...redacted,
        replies: walk(redacted.replies),
      };
    });

  return walk(comments);
}
