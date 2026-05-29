import { describe, expect, it } from 'vitest';
import { finalizeCommentsForViewer } from '@/lib/commentViewerPrivacy';
import { redactCircleReplyForViewer, redactCircleThreadForViewer } from '@/lib/circleViewerPrivacy';
import {
  finalizeNotificationsForViewer,
  notificationActorHasProfile,
  anonymousNotificationActor,
} from '@/lib/notificationPrivacy';
import { redactAnonymousPostForViewer, ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import type { CircleReply, CircleThread, Comment, NotificationItem, Post } from '@/types';

const realAuthor = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const viewerOther = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('postViewerPrivacy', () => {
  it('redacts anonymous post creator for non-authors', () => {
    const post = {
      id: 'post-1',
      creatorId: realAuthor,
      isAnonymous: true,
      creator: { id: realAuthor, displayName: 'Real Name' },
    } as Post;
    const out = redactAnonymousPostForViewer(post, viewerOther);
    expect(out.creatorId).toBe(ANONYMOUS_PUBLIC_CREATOR_ID);
    expect(out.creator.displayName).toMatch(/^Anonymous /);
  });

  it('preserves identity for the author', () => {
    const post = {
      id: 'post-1',
      creatorId: realAuthor,
      isAnonymous: true,
      creator: { id: realAuthor, displayName: 'Real Name' },
    } as Post;
    const out = redactAnonymousPostForViewer(post, realAuthor);
    expect(out.creatorId).toBe(realAuthor);
  });
});

describe('commentViewerPrivacy', () => {
  it('masks comment authors on anonymous posts', () => {
    const comments = [
      {
        id: 'c1',
        postId: 'post-1',
        author: { id: realAuthor, displayName: 'Real Name' },
        content: 'hi',
        replies: [],
      },
    ] as unknown as Comment[];
    const out = finalizeCommentsForViewer(comments, 'post-1', {
      isAnonymous: true,
      viewerId: viewerOther,
    });
    expect(out[0].author.id).toBe(ANONYMOUS_PUBLIC_CREATOR_ID);
  });
});

describe('circleViewerPrivacy', () => {
  const thread = {
    id: 'thread-1',
    circleSlug: 'confessions',
    authorId: realAuthor,
    author: { id: realAuthor, displayName: 'Real Name' },
  } as CircleThread;

  it('masks confessions thread author for other viewers', () => {
    const out = redactCircleThreadForViewer(thread, viewerOther);
    expect(out.authorId).toBe(ANONYMOUS_PUBLIC_CREATOR_ID);
  });

  it('masks confessions reply author for other viewers', () => {
    const reply = {
      id: 'r1',
      threadId: thread.id,
      authorId: realAuthor,
      author: { id: realAuthor, displayName: 'Real Name' },
    } as CircleReply;
    const out = redactCircleReplyForViewer(reply, thread, viewerOther);
    expect(out.authorId).toBe(ANONYMOUS_PUBLIC_CREATOR_ID);
  });
});

describe('notificationPrivacy', () => {
  it('hides profile navigation for circle_post_digest alerts', () => {
    const n = {
      id: '1',
      type: 'circle_post_digest' as const,
      actor: anonymousNotificationActor(),
      message: '3 new posts in Nurses',
      createdAt: new Date().toISOString(),
      read: false,
      communityId: 'c1',
    };
    expect(notificationActorHasProfile(n)).toBe(false);
  });

  it('hides profile navigation for anonymous circle_new_post alerts', () => {
    const n = {
      id: 'n1',
      type: 'circle_new_post',
      message: 'New anonymous post in Confessions',
      actor: { id: ANONYMOUS_PUBLIC_CREATOR_ID, displayName: 'Anonymous' },
      createdAt: '',
      read: false,
    } as NotificationItem;
    expect(notificationActorHasProfile(n)).toBe(false);
  });

  it('redacts confessions-scoped notifications for recipients', () => {
    const n = {
      id: 'n2',
      type: 'comment',
      communityId: 'confessions-id',
      message: 'Nice post',
      actor: { id: realAuthor, displayName: 'Real Name' },
      createdAt: '',
      read: false,
    } as NotificationItem;
    const out = finalizeNotificationsForViewer([n], {
      confessionsCommunityId: 'confessions-id',
      viewerId: viewerOther,
    });
    expect(out[0].actor.id).toBe(ANONYMOUS_PUBLIC_CREATOR_ID);
  });
});
