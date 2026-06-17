import type { CircleActivityBadgeRow } from '@/types';

export type { CircleActivityBadgeRow };

export type CircleActivityBadgeLabel = {
  text: string;
  tone: 'reply' | 'post' | 'question' | 'hot';
};

/** Pick the highest-priority real badge label for a card. */
export function pickCircleActivityBadge(row: CircleActivityBadgeRow): CircleActivityBadgeLabel | null {
  if (row.newRepliesOnYours > 0) {
    return {
      text:
        row.newRepliesOnYours === 1
          ? 'New reply to you'
          : `${row.newRepliesOnYours} new replies`,
      tone: 'reply',
    };
  }
  if (row.newWallPosts > 0) {
    return {
      text: row.newWallPosts === 1 ? 'New post' : `${row.newWallPosts} new posts`,
      tone: 'post',
    };
  }
  if (row.newThreads > 0) {
    return {
      text: row.newThreads === 1 ? 'New thread' : `${row.newThreads} new threads`,
      tone: 'post',
    };
  }
  if (row.unansweredQuestions > 0) {
    return {
      text:
        row.unansweredQuestions === 1
          ? 'Unanswered question'
          : `${row.unansweredQuestions} unanswered`,
      tone: 'question',
    };
  }
  if (row.isHotToday) {
    return { text: 'Hot today', tone: 'hot' };
  }
  return null;
}
