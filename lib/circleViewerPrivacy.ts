import { anonymousDisplayName, isAnonymousConfessionCircle } from '@/lib/anonymousCircle';
import { ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import type { CircleReply, CircleThread, CreatorSummary } from '@/types';

function anonymousCircleAuthor(authorId: string, scopeId: string): CreatorSummary {
  return {
    id: ANONYMOUS_PUBLIC_CREATOR_ID,
    displayName: anonymousDisplayName(authorId, scopeId),
    avatarUrl: '',
    role: '',
    specialty: '',
    city: '',
    state: '',
    isVerified: false,
  };
}

export function redactCircleThreadForViewer(
  thread: CircleThread,
  viewerId?: string | null,
): CircleThread {
  if (!isAnonymousConfessionCircle(thread.circleSlug)) return thread;
  if (viewerId && viewerId === thread.authorId) return thread;
  if (thread.authorId === ANONYMOUS_PUBLIC_CREATOR_ID) return thread;

  const realAuthorId = thread.authorId;
  return {
    ...thread,
    authorId: ANONYMOUS_PUBLIC_CREATOR_ID,
    author: anonymousCircleAuthor(realAuthorId, thread.id),
  };
}

export function redactCircleReplyForViewer(
  reply: CircleReply,
  thread: Pick<CircleThread, 'id' | 'circleSlug' | 'authorId'>,
  viewerId?: string | null,
): CircleReply {
  if (!isAnonymousConfessionCircle(thread.circleSlug)) return reply;
  if (viewerId && viewerId === reply.authorId) return reply;
  if (reply.authorId === ANONYMOUS_PUBLIC_CREATOR_ID) return reply;

  const realAuthorId = reply.authorId;
  return {
    ...reply,
    authorId: ANONYMOUS_PUBLIC_CREATOR_ID,
    author: anonymousCircleAuthor(realAuthorId, thread.id),
  };
}

export function finalizeCircleThreadsForViewer(
  threads: CircleThread[],
  viewerId?: string | null,
): CircleThread[] {
  return threads.map((t) => redactCircleThreadForViewer(t, viewerId));
}

export function finalizeCircleRepliesForViewer(
  replies: CircleReply[],
  thread: Pick<CircleThread, 'id' | 'circleSlug' | 'authorId'>,
  viewerId?: string | null,
): CircleReply[] {
  return replies.map((r) => redactCircleReplyForViewer(r, thread, viewerId));
}
