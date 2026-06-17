import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { AudienceRole, ContentInterest, CreatorAudienceTag } from '@/types';

type ProfilesUpdate = Database['public']['Tables']['profiles']['Update'];
export const onboardingDb = {
  async replaceUserInterests(userId: string, interests: ContentInterest[]): Promise<void> {
    const uniq = [...new Set(interests.filter(Boolean))];
    const { error: delErr } = await supabase.from('user_interests').delete().eq('user_id', userId);
    if (delErr) throw delErr;
    if (uniq.length === 0) return;
    const { error: insErr } = await supabase.from('user_interests').insert(
      uniq.map((interest) => ({ user_id: userId, interest })),
    );
    if (insErr) throw insErr;
  },

  async saveOnboardingProfile(
    userId: string,
    input: {
      audienceRole: AudienceRole | null;
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
      complete: boolean;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const patch: ProfilesUpdate = {
      audience_role: input.audienceRole,
      updated_at: now,
    };    if (input.displayName?.trim()) patch.display_name = input.displayName.trim();
    if (input.username !== undefined) patch.username = input.username;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.city !== undefined) patch.city = input.city;
    if (input.state !== undefined) patch.state = input.state;
    if (input.role !== undefined) patch.role = input.role;
    if (input.specialty !== undefined) patch.specialty = input.specialty;
    if (input.yearsExperience !== undefined) patch.years_experience = input.yearsExperience;
    if (input.creatorAudienceTags !== undefined) {
      patch.creator_audience_tags = input.creatorAudienceTags;
    }
    if (input.medicalSafetyAcknowledged) {
      patch.medical_safety_acknowledged_at = now;
    }
    if (input.complete) {
      patch.onboarding_completed_at = now;
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) throw error;
  },
};
