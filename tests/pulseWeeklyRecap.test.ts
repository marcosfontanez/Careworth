import { describe, expect, it } from 'vitest';
import {
  buildPulseWeeklyRecapRows,
  parsePulseWeeklyRecap,
  pulseWeeklyRecapHasVisibleContent,
} from '@/lib/pulseWeeklyRecap';

describe('parsePulseWeeklyRecap', () => {
  it('maps RPC snake_case into typed recap', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      top_moment: {
        id: 'post-1',
        type: 'video',
        caption: 'Night shift recap',
        like_count: 12,
        comment_count: 3,
        thumbnail_url: 'https://example.com/thumb.jpg',
      },
      new_followers: 2,
      new_shoutouts: 1,
      pulse_updates_this_week: 0,
    });

    expect(recap?.topMoment?.id).toBe('post-1');
    expect(recap?.topMoment?.likeCount).toBe(12);
    expect(recap?.newFollowers).toBe(2);
    expect(recap?.newShoutouts).toBe(1);
  });

  it('returns null for empty payload', () => {
    expect(parsePulseWeeklyRecap(null)).toBeNull();
  });
});

describe('buildPulseWeeklyRecapRows', () => {
  it('dedupes top moment and most pulsed when same post', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      top_moment: {
        id: 'post-1',
        type: 'image',
        caption: 'Same post',
        like_count: 5,
        comment_count: 0,
      },
      most_pulsed: {
        kind: 'post',
        id: 'post-1',
        type: 'image',
        label: 'Same post',
        like_count: 5,
      },
    });

    expect(recap).not.toBeNull();
    const rows = buildPulseWeeklyRecapRows(recap!);
    expect(rows.some((r) => r.key === 'top_moment')).toBe(true);
    expect(rows.some((r) => r.key === 'most_pulsed')).toBe(false);
  });

  it('shows empty-state signal when no visible rows', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: false,
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 0,
    });

    expect(recap).not.toBeNull();
    expect(pulseWeeklyRecapHasVisibleContent(recap!)).toBe(false);
  });

  it('shows keep going for pulse updates only', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 2,
    });

    const rows = buildPulseWeeklyRecapRows(recap!);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('keep_going');
  });
});
