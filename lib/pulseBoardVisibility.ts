import type { UserProfile } from '@/types';
import type { ProfileContentBlockState } from '@/utils/mypagePosts';

/** Pulse Board is on unless the owner explicitly disabled it. */
export function isPulseBoardEnabled(
  user: Pick<UserProfile, 'pulseBoardEnabled'>,
): boolean {
  return user.pulseBoardEnabled !== false;
}

type PulseBoardViewerOptions = {
  blockRelationship?: ProfileContentBlockState;
  viewerIsStaff?: boolean;
};

/**
 * Whether a visitor may read or post on the Pulse Board.
 * Independent of profile privacy — only `pulse_board_enabled` and blocks apply.
 */
export function canVisitorViewPulseBoard(
  user: Pick<UserProfile, 'pulseBoardEnabled'>,
  isOwner: boolean,
  options?: PulseBoardViewerOptions,
): boolean {
  if (isOwner) return true;
  if (options?.viewerIsStaff) return true;
  if (!isPulseBoardEnabled(user)) return false;

  const block = options?.blockRelationship ?? 'none';
  if (block === 'unknown' || block === 'viewer_blocked' || block === 'blocked_by_viewer') {
    return false;
  }

  return true;
}

/** Mount Pulse Board section: owners always; visitors when board is on and not blocked. */
export function shouldShowPulseBoardSection(
  user: Pick<UserProfile, 'pulseBoardEnabled'>,
  isOwner: boolean,
  options?: PulseBoardViewerOptions,
): boolean {
  if (isOwner) return true;
  return canVisitorViewPulseBoard(user, false, options);
}
