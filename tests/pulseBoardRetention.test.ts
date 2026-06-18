import { describe, expect, it } from 'vitest';
import {
  PULSE_BOARD_FLOATING_MAX_PER_AUTHOR,
  PULSE_BOARD_FLOATING_POOL_MAX,
  PULSE_BOARD_FLOATING_VISIBLE_SLOTS,
  PULSE_BOARD_OWNER_MANAGEMENT_MAX,
  PULSE_BOARD_PUBLIC_HISTORY_MAX,
  buildPulseBoardFloatingPool,
  coerceProfileBoardFeed,
  isPulseBoardPubliclyVisible,
  splitPulseBoardDisplay,
} from '@/lib/pulseBoardRetention';
import type { ProfileBoardShoutout } from '@/types';

function shoutout(
  partial: Partial<ProfileBoardShoutout> & Pick<ProfileBoardShoutout, 'id' | 'authorId'>,
): ProfileBoardShoutout {
  return {
    profileOwnerId: 'owner-1',
    body: 'Hello',
    status: 'active',
    pinnedAt: null,
    archivedAt: null,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial,
  };
}

describe('pulseBoardRetention', () => {
  it('exports expected caps', () => {
    expect(PULSE_BOARD_FLOATING_VISIBLE_SLOTS).toBeGreaterThanOrEqual(3);
    expect(PULSE_BOARD_FLOATING_VISIBLE_SLOTS).toBeLessThanOrEqual(4);
    expect(PULSE_BOARD_FLOATING_POOL_MAX).toBe(12);
    expect(PULSE_BOARD_FLOATING_MAX_PER_AUTHOR).toBe(2);
    expect(PULSE_BOARD_PUBLIC_HISTORY_MAX).toBe(30);
    expect(PULSE_BOARD_OWNER_MANAGEMENT_MAX).toBe(100);
  });

  it('hides non-active and archived from public visibility', () => {
    expect(isPulseBoardPubliclyVisible(shoutout({ id: '1', authorId: 'a' }))).toBe(true);
    expect(
      isPulseBoardPubliclyVisible(
        shoutout({ id: '2', authorId: 'a', archivedAt: new Date().toISOString() }),
      ),
    ).toBe(false);
    expect(
      isPulseBoardPubliclyVisible(shoutout({ id: '3', authorId: 'a', status: 'hidden' })),
    ).toBe(false);
  });

  it('limits floating pool to 12 and max 2 per author', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      shoutout({
        id: `s-${i}`,
        authorId: i < 10 ? 'author-a' : `author-${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      }),
    );

    const pool = buildPulseBoardFloatingPool(items);
    expect(pool.length).toBe(PULSE_BOARD_FLOATING_POOL_MAX);
    expect(pool.filter((s) => s.authorId === 'author-a').length).toBe(
      PULSE_BOARD_FLOATING_MAX_PER_AUTHOR,
    );
  });

  it('coerces legacy cached shoutout arrays', () => {
    const legacy = [
      shoutout({ id: 'pin', authorId: 'a', pinnedAt: new Date().toISOString() }),
      shoutout({ id: 'b', authorId: 'b' }),
    ];
    const feed = coerceProfileBoardFeed(legacy);
    expect(feed?.pinned?.id).toBe('pin');
    expect(feed?.items.map((s) => s.id)).toEqual(['b']);
  });

  it('splits visitor feed into pinned, rotating pool, and public history', () => {
    const pinned = shoutout({
      id: 'pin',
      authorId: 'p',
      pinnedAt: new Date().toISOString(),
    });
    const unpinned = Array.from({ length: 40 }, (_, i) =>
      shoutout({
        id: `u-${i}`,
        authorId: `author-${i % 5}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      }),
    );

    const { pinnedShoutout, rotatingShoutouts, staticShoutouts } = splitPulseBoardDisplay(
      { pinned, items: unpinned, isOwnerView: false },
      false,
    );

    expect(pinnedShoutout?.id).toBe('pin');
    expect(rotatingShoutouts.length).toBeLessThanOrEqual(PULSE_BOARD_FLOATING_POOL_MAX);
    expect(staticShoutouts.length).toBe(PULSE_BOARD_PUBLIC_HISTORY_MAX);
    expect(staticShoutouts.every(isPulseBoardPubliclyVisible)).toBe(true);
  });

  it('lets owners browse up to 100 including archived unpinned', () => {
    const archived = shoutout({
      id: 'old',
      authorId: 'a',
      archivedAt: new Date().toISOString(),
    });
    const fresh = shoutout({ id: 'new', authorId: 'b' });
    const { staticShoutouts } = splitPulseBoardDisplay(
      { pinned: null, items: [fresh, archived], isOwnerView: true },
      true,
    );

    expect(staticShoutouts.map((s) => s.id)).toEqual(['new', 'old']);
  });
});
