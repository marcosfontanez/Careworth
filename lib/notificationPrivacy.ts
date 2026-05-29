import { ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import type { CreatorSummary, NotificationItem } from '@/types';

const CONFESSIONS_SCOPED_TYPES = new Set([
  'circle_new_post',
  'circle_post_digest',
  'circle_thread_reply',
  'comment',
  'reply',
]);

export function anonymousNotificationActor(): CreatorSummary {
  return {
    id: ANONYMOUS_PUBLIC_CREATOR_ID,
    displayName: 'Anonymous',
    avatarUrl: '',
    role: '',
    specialty: '',
    city: '',
    state: '',
    isVerified: false,
  };
}

/** True when tapping the avatar should open a profile (not pseudonymous / system). */
export function notificationActorHasProfile(notification: NotificationItem): boolean {
  if (notification.type === 'circle_post_digest') return false;
  const id = notification.actor?.id?.trim();
  if (!id || id === ANONYMOUS_PUBLIC_CREATOR_ID) return false;
  if (notification.type === 'circle_new_post' && notification.message.toLowerCase().includes('anonymous')) {
    return false;
  }
  return true;
}

export function redactNotificationForViewer(
  notification: NotificationItem,
  opts?: { confessionsCommunityId?: string | null; viewerId?: string | null },
): NotificationItem {
  const actorId = notification.actor?.id?.trim();
  const actorMissing = !actorId || actorId === ANONYMOUS_PUBLIC_CREATOR_ID;
  const confessionsScoped =
    !!opts?.confessionsCommunityId &&
    notification.communityId === opts.confessionsCommunityId &&
    CONFESSIONS_SCOPED_TYPES.has(notification.type);

  if (!actorMissing && !confessionsScoped) return notification;
  if (opts?.viewerId && actorId === opts.viewerId) return notification;

  return {
    ...notification,
    actor: anonymousNotificationActor(),
  };
}

export function finalizeNotificationsForViewer(
  notifications: NotificationItem[],
  opts?: { confessionsCommunityId?: string | null; viewerId?: string | null },
): NotificationItem[] {
  return notifications.map((n) => redactNotificationForViewer(n, opts));
}
