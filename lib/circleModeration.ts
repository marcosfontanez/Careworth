/** Circle thread/reply moderation statuses (migration 219). */
export type CircleModerationStatus = 'active' | 'hidden' | 'removed' | 'pending_review';

export const CIRCLE_MODERATION_ACTIVE: CircleModerationStatus = 'active';

export const CIRCLE_THREAD_REMOVED_MESSAGE =
  'This discussion is no longer available.';

export const CIRCLE_REPLY_REMOVED_TOMBSTONE =
  'This reply was removed by moderation.';

export const CIRCLE_PENDING_REVIEW_MESSAGE =
  'This content is under review and is temporarily hidden.';

export function circleContentIsPubliclyVisible(
  status: CircleModerationStatus | string | null | undefined,
): boolean {
  return (status ?? CIRCLE_MODERATION_ACTIVE) === CIRCLE_MODERATION_ACTIVE;
}
