import type { UserProfile } from '@/types';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { needsOnboarding } from '@/lib/onboarding/needsOnboarding';

export type AccountEntryGate =
  | 'loading'
  | 'guest'
  | 'profile_unavailable'
  | 'needs_legal_ack'
  | 'needs_onboarding'
  | 'ready';

/** Decide where index routing should send an authenticated user. */
export function resolveAccountEntryGate(input: {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: UserProfile | null;
}): AccountEntryGate {
  const { isLoading, isAuthenticated, profile } = input;
  if (isLoading) return 'loading';
  if (!isAuthenticated) return 'guest';
  if (!profile) return 'profile_unavailable';
  if (needsLegalAcknowledgment(profile)) return 'needs_legal_ack';
  if (needsOnboarding(profile)) return 'needs_onboarding';
  return 'ready';
}

/** Legal ack + onboarding finished (profile only — ignores current route). */
export function isAccountSetupComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (needsLegalAcknowledgment(profile)) return false;
  if (needsOnboarding(profile)) return false;
  return true;
}

/** True while the user is still on auth or onboarding routes (before the main app). */
export function isPreAccountReadyRoute(pathname: string, segments: readonly string[]): boolean {
  if (pathname.startsWith('/auth') || segments.some((s) => s === 'auth')) return true;
  if (pathname.startsWith('/onboarding') || segments.some((s) => s === 'onboarding')) return true;
  return false;
}

/**
 * Gift boxes, reward toasts, and team border modals: setup finished **and** user left
 * signup / onboarding screens (Feed, tabs, etc.).
 */
export function canShowAccountRewardGates(input: {
  profile: UserProfile | null | undefined;
  pathname?: string;
  segments?: readonly string[];
}): boolean {
  const { profile, pathname = '', segments = [] } = input;
  if (!isAccountSetupComplete(profile)) return false;
  if (isPreAccountReadyRoute(pathname, segments)) return false;
  return true;
}
