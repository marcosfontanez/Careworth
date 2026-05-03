import type { UserProfile } from '@/types';

/**
 * True when the user should complete onboarding (role, specialty, location).
 * Only evaluates when `profile` is non-null — if the profile row failed to
 * load, callers typically should not force this screen (avoid redirect loops).
 */
export function needsProfileOnboarding(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (!String(profile.city ?? '').trim() || !String(profile.state ?? '').trim()) return true;
  if (!String(profile.role ?? '').trim() || !String(profile.specialty ?? '').trim()) return true;
  return false;
}
