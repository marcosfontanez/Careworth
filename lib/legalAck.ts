import type { UserProfile } from '@/types';

/**
 * True when the signed-in user must complete the in-app legal / HIPAA acknowledgment.
 * Source of truth: `profiles.terms_and_privacy_accepted_at`, set only via `app/auth/legal-ack.tsx`.
 * Signup does not persist consent — first sign-in routes here before app entry.
 * When `profile` is null, callers must block app entry via {@link resolveAccountEntryGate}
 * — never treat null as “legal ack satisfied”.
 */
export function needsLegalAcknowledgment(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const t = profile.termsPrivacyAcceptedAt;
  return t == null || String(t).trim() === '';
}
