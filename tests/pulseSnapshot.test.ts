import { describe, expect, it } from 'vitest';
import { buildPulseSnapshot } from '@/lib/pulseSnapshot';
import { parsePulseWeeklyRecap } from '@/lib/pulseWeeklyRecap';
import type { ProfileUpdate, UserProfile } from '@/types';

const baseUser = {
  pulseStatusText: 'On shift',
  pulseStatusUpdatedAt: new Date().toISOString(),
  pulseBoardEnabled: true,
} satisfies Pick<UserProfile, 'pulseStatusText' | 'pulseStatusUpdatedAt' | 'pulseBoardEnabled'>;

describe('buildPulseSnapshot', () => {
  it('builds hero from most pulsed with real counts', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      most_pulsed: {
        kind: 'post',
        id: 'post-photo',
        type: 'image',
        label: 'Night shift selfie',
        like_count: 8,
        thumbnail_url: 'https://example.com/thumb.jpg',
      },
      new_followers: 0,
      new_shoutouts: 0,
      new_comments: 0,
      new_pulses: 0,
      new_media: 0,
      pulse_updates_this_week: 0,
    });

    const snapshot = buildPulseSnapshot(recap!, baseUser);
    expect(snapshot.hero?.id).toBe('post-photo');
    expect(snapshot.hero?.metricLabel).toBe('8 pulses');
    expect(snapshot.hero?.reason).toContain('Pulse hearts');
    expect(snapshot.isEmpty).toBe(false);
  });

  it('shows activity chips only for non-zero metrics', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      new_followers: 3,
      new_shoutouts: 2,
      new_comments: 5,
      new_pulses: 0,
      new_media: 1,
      pulse_updates_this_week: 1,
    });

    const snapshot = buildPulseSnapshot(recap!, baseUser);
    expect(snapshot.activity.map((m) => m.key)).toEqual(['followers', 'shoutouts', 'comments']);
    expect(snapshot.activity.find((m) => m.key === 'followers')?.value).toBe(3);
  });

  it('respects pinned My Pulse update even when recap omits featured_moment', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 1,
    });

    const snapshot = buildPulseSnapshot(recap!, baseUser, [
      { id: 'pu-pinned', isPinned: true } as ProfileUpdate,
    ]);

    expect(snapshot.attention.some((a) => a.key === 'feature_moment')).toBe(false);
    expect(snapshot.suggestedActions).not.toContain('feature_moment');
    expect(snapshot.suggestedActions).not.toContain('feature_hero');
  });

  it('flags stale Today\'s Pulse and missing featured moment', () => {
    const staleDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: false,
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 0,
    });

    const snapshot = buildPulseSnapshot(recap!, {
      ...baseUser,
      pulseStatusText: 'Old status',
      pulseStatusUpdatedAt: staleDate,
    });

    expect(snapshot.attention.some((a) => a.key === 'update_todays_pulse')).toBe(true);
    expect(snapshot.attention.some((a) => a.key === 'feature_moment')).toBe(true);
    expect(snapshot.isEmpty).toBe(false);
  });

  it('returns empty when no weekly signal and profile is healthy', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: false,
      new_followers: 0,
      new_shoutouts: 0,
      new_comments: 0,
      new_pulses: 0,
      new_media: 0,
      pulse_updates_this_week: 0,
      featured_moment: {
        id: 'pu-1',
        type: 'thought',
        label: 'Pinned thought',
        created_at: new Date().toISOString(),
      },
    });

    const snapshot = buildPulseSnapshot(recap!, baseUser);
    expect(snapshot.isEmpty).toBe(true);
    expect(snapshot.suggestedActions).toEqual([]);
    expect(snapshot.emptyStateActions).toEqual([]);
  });

  it('treats legacy bio as Today\'s Pulse for snapshot checks', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: false,
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 0,
      featured_moment: {
        id: 'pu-1',
        type: 'thought',
        label: 'Pinned thought',
        created_at: new Date().toISOString(),
      },
    });

    const snapshot = buildPulseSnapshot(
      recap!,
      {
        pulseStatusText: null,
        pulseStatusUpdatedAt: null,
        pulseBoardEnabled: true,
        bio: 'Night shift nurse',
      },
    );

    expect(snapshot.attention.some((a) => a.key === 'update_todays_pulse')).toBe(false);
    expect(snapshot.emptyStateActions).not.toContain('update_todays_pulse');
  });

  it('does not surface month ago in snapshot model', () => {
    const recap = parsePulseWeeklyRecap({
      week_start: '2026-05-24T00:00:00.000Z',
      has_activity: true,
      month_ago: {
        kind: 'post',
        id: 'old-post',
        label: 'Throwback',
        like_count: 20,
        created_at: '2026-04-24T00:00:00.000Z',
      },
      featured_moment: {
        id: 'pu-1',
        type: 'thought',
        label: 'Pinned',
        created_at: new Date().toISOString(),
      },
      new_followers: 0,
      new_shoutouts: 0,
      pulse_updates_this_week: 0,
    });

    const snapshot = buildPulseSnapshot(recap!, baseUser);
    expect(snapshot.hero).toBeUndefined();
    expect(snapshot.activity).toHaveLength(0);
    expect(snapshot.isEmpty).toBe(true);
  });
});
