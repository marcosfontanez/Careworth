import { describe, expect, it } from 'vitest';
import { pickCircleActivityBadge } from '@/lib/circleActivityBadges';
import type { CircleActivityBadgeRow } from '@/types';

describe('pickCircleActivityBadge', () => {
  const base: CircleActivityBadgeRow = {
    communityId: 'c1',
    newWallPosts: 0,
    newThreads: 0,
    newRepliesOnYours: 0,
    unansweredQuestions: 0,
  };

  it('prioritizes new replies to you', () => {
    const label = pickCircleActivityBadge({
      ...base,
      newRepliesOnYours: 2,
      newWallPosts: 5,
      unansweredQuestions: 3,
    });
    expect(label?.text).toBe('2 new replies');
    expect(label?.tone).toBe('reply');
  });

  it('shows unanswered when nothing else', () => {
    const label = pickCircleActivityBadge({ ...base, unansweredQuestions: 1 });
    expect(label?.text).toBe('Unanswered question');
  });

  it('returns null when no activity', () => {
    expect(pickCircleActivityBadge(base)).toBeNull();
  });
});
