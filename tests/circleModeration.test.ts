import { describe, expect, it } from 'vitest';
import {
  circleContentIsPubliclyVisible,
  CIRCLE_MODERATION_ACTIVE,
  CIRCLE_REPLY_REMOVED_TOMBSTONE,
  CIRCLE_PENDING_REVIEW_MESSAGE,
} from '@/lib/circleModeration';

describe('circleModeration', () => {
  it('treats active content as publicly visible', () => {
    expect(circleContentIsPubliclyVisible(CIRCLE_MODERATION_ACTIVE)).toBe(true);
    expect(circleContentIsPubliclyVisible(null)).toBe(true);
  });

  it('hides removed and hidden content from public lists', () => {
    expect(circleContentIsPubliclyVisible('removed')).toBe(false);
    expect(circleContentIsPubliclyVisible('hidden')).toBe(false);
    expect(circleContentIsPubliclyVisible('pending_review')).toBe(false);
  });

  it('uses stable reply tombstone copy', () => {
    expect(CIRCLE_REPLY_REMOVED_TOMBSTONE).toContain('removed by moderation');
  });

  it('uses stable pending review copy', () => {
    expect(CIRCLE_PENDING_REVIEW_MESSAGE).toContain('under review');
  });
});
