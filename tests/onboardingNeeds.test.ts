import { describe, expect, it } from 'vitest';
import {
  isHealthcareProfessionalPath,
  needsMedicalSafetyStep,
  needsOnboarding,
} from '@/lib/onboarding/needsOnboarding';
import type { UserProfile } from '@/types';

const baseProfile = {
  id: 'user-1',
  displayName: 'Alex',
  firstName: 'Alex',
  lastName: '',
  role: '',
  specialty: '',
  city: '',
  state: '',
  yearsExperience: 0,
  bio: '',
  avatarUrl: '',
  followerCount: 0,
  followingCount: 0,
  likeCount: 0,
  postCount: 0,
  badges: [],
  communitiesJoined: [],
  privacyMode: 'public',
  interests: [],
  isVerified: false,
  shiftPreference: 'No Preference',
  termsPrivacyAcceptedAt: '2026-01-01T00:00:00.000Z',
} satisfies UserProfile;

describe('needsOnboarding', () => {
  it('returns false when profile is missing (fail open)', () => {
    expect(needsOnboarding(null)).toBe(false);
    expect(needsOnboarding(undefined)).toBe(false);
  });

  it('routes new users without onboarding_completed_at', () => {
    expect(needsOnboarding({ ...baseProfile, onboardingCompletedAt: null })).toBe(true);
  });

  it('bypasses users who finished onboarding', () => {
    expect(
      needsOnboarding({
        ...baseProfile,
        onboardingCompletedAt: '2026-06-01T00:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('defers to legal ack before onboarding', () => {
    expect(
      needsOnboarding({
        ...baseProfile,
        termsPrivacyAcceptedAt: null,
        onboardingCompletedAt: null,
      }),
    ).toBe(false);
  });
});

describe('needsMedicalSafetyStep', () => {
  it('requires safety for caregiver and learn paths', () => {
    expect(
      needsMedicalSafetyStep({ audienceRole: 'caregiver_family', interests: [] }),
    ).toBe(true);
    expect(
      needsMedicalSafetyStep({ audienceRole: 'here_to_learn', interests: [] }),
    ).toBe(true);
  });

  it('requires safety for education interests', () => {
    expect(
      needsMedicalSafetyStep({ audienceRole: null, interests: ['education'] }),
    ).toBe(true);
  });

  it('skips safety for humor-only paths', () => {
    expect(
      needsMedicalSafetyStep({ audienceRole: 'stories_humor', interests: ['humor'] }),
    ).toBe(false);
  });
});

describe('isHealthcareProfessionalPath', () => {
  it('identifies healthcare worker and student paths', () => {
    expect(isHealthcareProfessionalPath('healthcare_worker')).toBe(true);
    expect(isHealthcareProfessionalPath('healthcare_student')).toBe(true);
    expect(isHealthcareProfessionalPath('support_creators')).toBe(false);
  });
});
