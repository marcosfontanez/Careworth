import { communityService } from '@/services/community';
import { communitiesService } from '@/services/supabase/communities';
import { onboardingDb } from '@/services/supabase/onboardingDb';
import type { AudienceRole, ContentInterest, CreatorAudienceTag } from '@/types';

export const onboardingService = {
  replaceUserInterests: onboardingDb.replaceUserInterests,

  async joinCircles(userId: string, communityIds: string[]): Promise<void> {
    const uniq = [...new Set(communityIds.filter(Boolean))];
    for (const communityId of uniq) {
      try {
        const member = await communitiesService.isMember(userId, communityId);
        if (!member) {
          await communitiesService.toggleJoin(userId, communityId);
        }
      } catch {
        /* best-effort — user can join later from Circles tab */
      }
    }
  },

  async completeOnboarding(
    userId: string,
    input: {
      audienceRole: AudienceRole | null;
      interests: ContentInterest[];
      circleIds: string[];
      displayName?: string;
      username?: string | null;
      bio?: string;
      city?: string;
      state?: string;
      role?: string;
      specialty?: string;
      yearsExperience?: number;
      medicalSafetyAcknowledged?: boolean;
      creatorAudienceTags?: CreatorAudienceTag[];
    },
  ): Promise<void> {
    await onboardingDb.replaceUserInterests(userId, input.interests);
    await onboardingDb.saveOnboardingProfile(userId, {
      audienceRole: input.audienceRole,
      displayName: input.displayName,
      username: input.username,
      bio: input.bio,
      city: input.city,
      state: input.state,
      role: input.role,
      specialty: input.specialty,
      yearsExperience: input.yearsExperience,
      medicalSafetyAcknowledged: input.medicalSafetyAcknowledged,
      creatorAudienceTags: input.creatorAudienceTags,
      complete: true,
    });
    if (input.circleIds.length > 0) {
      await onboardingService.joinCircles(userId, input.circleIds);
    }
  },

  async skipOnboarding(userId: string): Promise<void> {
    await onboardingDb.saveOnboardingProfile(userId, {
      audienceRole: null,
      complete: true,
    });
  },
};
