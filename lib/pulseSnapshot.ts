import type { PulseWeeklyRecap } from '@/lib/pulseWeeklyRecap';
import { resolveMyPulseIntroLine } from '@/lib/pulseStatusDisplay';
import type { ProfileUpdate, UserProfile } from '@/types';

export type PulseSnapshotHero = {
  kind: 'post' | 'profile_update';
  id: string;
  type: string;
  label: string;
  thumbnailUrl?: string | null;
  likeCount: number;
  commentCount: number;
  reason: string;
  metricLabel: string;
};

export type PulseSnapshotActivityMetric = {
  key: 'followers' | 'shoutouts' | 'comments' | 'pulses';
  value: number;
  label: string;
};

export type PulseSnapshotAttentionKey =
  | 'review_shoutouts'
  | 'update_todays_pulse'
  | 'feature_moment'
  | 'board_off'
  | 'new_media';

export type PulseSnapshotAttention = {
  key: PulseSnapshotAttentionKey;
  message: string;
};

export type PulseSnapshotActionKey =
  | 'review_shoutouts'
  | 'update_todays_pulse'
  | 'feature_moment'
  | 'feature_hero'
  | 'create_update'
  | 'browse_media';

export type PulseSnapshotModel = {
  hero?: PulseSnapshotHero;
  activity: PulseSnapshotActivityMetric[];
  attention: PulseSnapshotAttention[];
  suggestedActions: PulseSnapshotActionKey[];
  isEmpty: boolean;
  /** Quiet-state CTAs — only items still missing (never hardcoded defaults). */
  emptyStateActions: PulseSnapshotActionKey[];
};

const PULSE_STATUS_STALE_DAYS = 5;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function pickHero(recap: PulseWeeklyRecap): PulseSnapshotHero | undefined {
  const mp = recap.mostPulsed;
  const mc = recap.mostCommented;
  const likesWin =
    mp &&
    mp.likeCount > 0 &&
    (!mc || mc.commentCount === 0 || mp.likeCount >= mc.commentCount);

  if (likesWin && mp) {
    const isPhoto = mp.type === 'image' || mp.type === 'pics';
    return {
      kind: mp.kind,
      id: mp.id,
      type: mp.type,
      label: mp.label || 'Your highlight',
      thumbnailUrl: mp.thumbnailUrl,
      likeCount: mp.likeCount,
      commentCount: 0,
      reason: isPhoto
        ? 'Your photo got the most Pulse hearts this week.'
        : 'This got the most Pulse hearts this week.',
      metricLabel: `${mp.likeCount} pulse${mp.likeCount === 1 ? '' : 's'}`,
    };
  }

  if (mc && mc.commentCount > 0) {
    return {
      kind: 'post',
      id: mc.id,
      type: mc.type,
      label: mc.caption || 'Your post',
      thumbnailUrl: mc.thumbnailUrl,
      likeCount: 0,
      commentCount: mc.commentCount,
      reason: 'This post had the most comments this week.',
      metricLabel: `${mc.commentCount} comment${mc.commentCount === 1 ? '' : 's'}`,
    };
  }

  const top = recap.topMoment;
  if (top && (top.likeCount > 0 || top.commentCount > 0)) {
    const parts: string[] = [];
    if (top.likeCount > 0) parts.push(`${top.likeCount} pulse${top.likeCount === 1 ? '' : 's'}`);
    if (top.commentCount > 0) {
      parts.push(`${top.commentCount} comment${top.commentCount === 1 ? '' : 's'}`);
    }
    return {
      kind: 'post',
      id: top.id,
      type: top.type,
      label: top.caption || 'Your post',
      thumbnailUrl: top.thumbnailUrl,
      likeCount: top.likeCount,
      commentCount: top.commentCount,
      reason: 'Your top moment this week by overall engagement.',
      metricLabel: parts.join(' · '),
    };
  }

  return undefined;
}

function hasFeaturedMoment(
  recap: PulseWeeklyRecap,
  profileUpdates?: ProfileUpdate[],
): boolean {
  if (profileUpdates?.some((update) => update.isPinned)) return true;
  return !!recap.featuredMoment;
}

export function buildPulseSnapshot(
  recap: PulseWeeklyRecap,
  user: Pick<UserProfile, 'pulseStatusText' | 'pulseStatusUpdatedAt' | 'pulseBoardEnabled'> &
    Partial<Pick<UserProfile, 'bio'>>,
  profileUpdates?: ProfileUpdate[],
): PulseSnapshotModel {
  const hero = pickHero(recap);
  const featured = hasFeaturedMoment(recap, profileUpdates);
  const { text: todaysPulseLine } = resolveMyPulseIntroLine(user as UserProfile);
  const hasTodaysPulse = Boolean(todaysPulseLine);
  const explicitPulseStatus = user.pulseStatusText?.trim() ?? '';
  const statusAge = daysSince(user.pulseStatusUpdatedAt);

  const activity: PulseSnapshotActivityMetric[] = [];
  if (recap.newFollowers > 0) {
    activity.push({
      key: 'followers',
      value: recap.newFollowers,
      label: recap.newFollowers === 1 ? 'Follower' : 'Followers',
    });
  }
  if (recap.newShoutouts > 0) {
    activity.push({
      key: 'shoutouts',
      value: recap.newShoutouts,
      label: recap.newShoutouts === 1 ? 'Shoutout' : 'Shoutouts',
    });
  }
  if (recap.newComments > 0) {
    activity.push({
      key: 'comments',
      value: recap.newComments,
      label: recap.newComments === 1 ? 'Comment' : 'Comments',
    });
  }
  if (recap.newPulses > 0) {
    activity.push({
      key: 'pulses',
      value: recap.newPulses,
      label: recap.newPulses === 1 ? 'Pulse' : 'Pulses',
    });
  }

  const attention: PulseSnapshotAttention[] = [];
  if (recap.newShoutouts > 0) {
    attention.push({
      key: 'review_shoutouts',
      message: `You have ${recap.newShoutouts} new Pulse Board shoutout${recap.newShoutouts === 1 ? '' : 's'} to review.`,
    });
  }

  if (!hasTodaysPulse) {
    attention.push({
      key: 'update_todays_pulse',
      message: "Today's Pulse is empty — add a quick status line.",
    });
  } else if (
    explicitPulseStatus &&
    statusAge != null &&
    statusAge >= PULSE_STATUS_STALE_DAYS
  ) {
    attention.push({
      key: 'update_todays_pulse',
      message: `Today's Pulse has not been updated in ${statusAge} days.`,
    });
  }

  if (!featured) {
    attention.push({
      key: 'feature_moment',
      message: 'You have no Featured Moment selected.',
    });
  }

  if (user.pulseBoardEnabled === false) {
    attention.push({
      key: 'board_off',
      message: 'Your Pulse Board is turned off for visitors.',
    });
  }

  if (recap.newMedia > 0) {
    attention.push({
      key: 'new_media',
      message: `You added ${recap.newMedia} new photo${recap.newMedia === 1 ? '' : 's'} this week for people to browse.`,
    });
  }

  const suggestedActions: PulseSnapshotActionKey[] = [];
  if (recap.newShoutouts > 0) suggestedActions.push('review_shoutouts');
  if (
    !hasTodaysPulse ||
    (explicitPulseStatus && statusAge != null && statusAge >= PULSE_STATUS_STALE_DAYS)
  ) {
    suggestedActions.push('update_todays_pulse');
  }
  if (!featured && hero) suggestedActions.push('feature_hero');
  else if (!featured) suggestedActions.push('feature_moment');
  if (recap.newMedia > 0 && suggestedActions.length < 3) {
    suggestedActions.push('browse_media');
  }
  if (recap.pulseUpdatesThisWeek === 0 && suggestedActions.length < 3) {
    suggestedActions.push('create_update');
  }

  const dedupedActions = [...new Set(suggestedActions)].slice(0, 3);

  const emptyStateActions: PulseSnapshotActionKey[] = [];
  if (!hasTodaysPulse) emptyStateActions.push('update_todays_pulse');
  if (!featured) emptyStateActions.push('feature_moment');

  const isEmpty =
    !hero &&
    activity.length === 0 &&
    attention.length === 0;

  return {
    hero,
    activity,
    attention,
    suggestedActions: isEmpty ? [] : dedupedActions,
    isEmpty,
    emptyStateActions,
  };
}

export const PULSE_SNAPSHOT_ACTION_LABELS: Record<PulseSnapshotActionKey, string> = {
  review_shoutouts: 'Review Pulse Board',
  update_todays_pulse: "Update Today's Pulse",
  feature_moment: 'Add Featured Moment',
  feature_hero: 'Feature your top moment',
  create_update: 'Post a Pulse update',
  browse_media: 'Browse Media Hub',
};

export const PULSE_SNAPSHOT_EMPTY_ACTIONS: PulseSnapshotActionKey[] = [
  'update_todays_pulse',
  'feature_moment',
  'create_update',
];
