import type { OnboardingData, UserProfile } from '@/types';

/** Build a real `UserProfile` from onboarding answers (no mock template). */
export function profileFromOnboarding(data: OnboardingData, userId: string): UserProfile {
  return {
    id: userId,
    displayName: data.displayName,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
    specialty: data.specialty,
    city: data.city,
    state: data.state,
    yearsExperience: data.yearsExperience,
    bio: data.bio ?? '',
    avatarUrl: data.avatarUrl ?? '',
    followerCount: 0,
    followingCount: 0,
    likeCount: 0,
    postCount: 0,
    badges: [],
    communitiesJoined: data.communitiesToFollow,
    circlesJoined: data.communitiesToFollow,
    privacyMode: data.privacyMode,
    interests: data.interests,
    isVerified: false,
    shiftPreference: data.shiftPreference,
  };
}
