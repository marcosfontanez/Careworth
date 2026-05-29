import { describe, expect, it } from 'vitest';
import {
  formatCircleDigestMessage,
  circleDigestNotificationHasActorProfile,
  isCirclePostDigestType,
} from '@/lib/circleNotificationDigest';

describe('circleNotificationDigest', () => {
  it('formats single Confessions digest without count spam', () => {
    expect(
      formatCircleDigestMessage({ postCount: 1, communityName: 'Confessions', isConfessions: true }),
    ).toBe('New activity in Confessions');
  });

  it('formats multi-post Confessions digest safely', () => {
    expect(
      formatCircleDigestMessage({ postCount: 3, communityName: 'Confessions', isConfessions: true }),
    ).toBe('3 new posts in Confessions');
  });

  it('formats named Circle digest counts', () => {
    expect(
      formatCircleDigestMessage({ postCount: 1, communityName: 'Nurses', isConfessions: false }),
    ).toBe('New post in Nurses');
    expect(
      formatCircleDigestMessage({ postCount: 4, communityName: 'Nurses', isConfessions: false }),
    ).toBe('4 new posts in Nurses');
  });

  it('falls back when community name missing', () => {
    expect(
      formatCircleDigestMessage({ postCount: 2, communityName: null, isConfessions: false }),
    ).toBe('2 new posts in a circle you joined');
  });

  it('digest notifications hide actor profile navigation', () => {
    expect(isCirclePostDigestType('circle_post_digest')).toBe(true);
    expect(circleDigestNotificationHasActorProfile('circle_post_digest')).toBe(false);
    expect(circleDigestNotificationHasActorProfile('circle_new_post')).toBe(true);
  });
});
