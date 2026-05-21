import type { UserProfile } from '@/types';
import { needsLegalAcknowledgment } from '@/lib/legalAck';

export type AccountEntryGate =
  | 'loading'
  | 'guest'
  | 'profile_unavailable'
  | 'needs_legal_ack'
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
  return 'ready';
}
