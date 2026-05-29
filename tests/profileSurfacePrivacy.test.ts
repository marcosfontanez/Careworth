import { describe, expect, it } from 'vitest';
import { canVisitorSeeProfileContent, canVisitorSeeProfilePosts } from '@/utils/mypagePosts';
import type { UserProfile } from '@/types';

const publicUser = { privacyMode: 'public' } as Pick<UserProfile, 'privacyMode'>;
const privateUser = { privacyMode: 'private' } as Pick<UserProfile, 'privacyMode'>;

describe('profile surface privacy helpers', () => {
  it('allows owners to see all profile content', () => {
    expect(canVisitorSeeProfileContent(privateUser, true)).toBe(true);
    expect(canVisitorSeeProfilePosts({ ...privateUser, id: 'u1' } as UserProfile, true)).toBe(true);
  });

  it('allows staff to see private profile content', () => {
    expect(
      canVisitorSeeProfileContent(privateUser, false, { viewerIsStaff: true }),
    ).toBe(true);
  });

  it('hides private profile content from strangers', () => {
    expect(canVisitorSeeProfileContent(privateUser, false)).toBe(false);
    expect(
      canVisitorSeeProfileContent(privateUser, false, { blockRelationship: 'none' }),
    ).toBe(false);
  });

  it('hides content when block relationship is unknown (fail-safe)', () => {
    expect(
      canVisitorSeeProfileContent(publicUser, false, { blockRelationship: 'unknown' }),
    ).toBe(false);
  });

  it('hides content for blocked relationships', () => {
    expect(
      canVisitorSeeProfileContent(publicUser, false, { blockRelationship: 'viewer_blocked' }),
    ).toBe(false);
    expect(
      canVisitorSeeProfileContent(publicUser, false, { blockRelationship: 'blocked_by_viewer' }),
    ).toBe(false);
  });

  it('allows public profile content for unblocked visitors', () => {
    expect(canVisitorSeeProfileContent(publicUser, false)).toBe(true);
  });

  it('does not treat followers as unlocking private profiles (deferred mode)', () => {
    expect(canVisitorSeeProfileContent(privateUser, false)).toBe(false);
  });
});
