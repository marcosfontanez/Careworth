import type { UserProfile } from '@/types';

/** True when the signed-in user must complete the in-app legal / HIPAA acknowledgment (e.g. OAuth sign-up). */
export function needsLegalAcknowledgment(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const t = profile.termsPrivacyAcceptedAt;
  return t == null || String(t).trim() === '';
}
