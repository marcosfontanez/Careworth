import type { AudienceRole, ContentInterest, UserProfile } from '@/types';
import { needsLegalAcknowledgment } from '@/lib/legalAck';

const SAFETY_AUDIENCES = new Set<AudienceRole>([
  'caregiver_family',
  'here_to_learn',
  'exploring_career',
]);

const SAFETY_INTERESTS = new Set<ContentInterest>([
  'education',
  'caregiver_support',
  'patient_family_guidance',
  'medical_mythbusters',
  'live_qa',
]);

export function needsOnboarding(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (needsLegalAcknowledgment(profile)) return false;
  return !profile.onboardingCompletedAt;
}

export function needsMedicalSafetyStep(input: {
  audienceRole: AudienceRole | null;
  interests: ContentInterest[];
}): boolean {
  if (input.audienceRole && SAFETY_AUDIENCES.has(input.audienceRole)) return true;
  return input.interests.some((i) => SAFETY_INTERESTS.has(i));
}

export function isHealthcareProfessionalPath(audienceRole: AudienceRole | null): boolean {
  return audienceRole === 'healthcare_worker' || audienceRole === 'healthcare_student';
}

/** True when "Skip for now" may complete onboarding without the safety acknowledgement step. */
export function canSkipOnboardingWithoutSafety(input: {
  audienceRole: AudienceRole | null;
  interests: ContentInterest[];
}): boolean {
  return !needsMedicalSafetyStep(input);
}
