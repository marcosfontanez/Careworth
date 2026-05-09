import type { UserProfile } from '@/types';

/** Apple “Hide My Email” addresses used for Sign in with Apple. */
export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.toLowerCase().includes('privaterelay.appleid.com');
}

/**
 * When true, we prompt the user to open Edit Profile: relay email can become display name / seed for @handle.
 */
export function profileNeedsPublicNameReview(
  profile: UserProfile | null,
  authEmail: string | null | undefined,
): boolean {
  if (!profile) return false;
  if (isApplePrivateRelayEmail(authEmail)) return true;
  const dn = (profile.displayName ?? '').toLowerCase();
  if (dn.includes('privaterelay.appleid.com')) return true;
  return false;
}
