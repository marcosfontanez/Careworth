import { ONBOARDING_CIRCLE_CATALOG, ONBOARDING_SENSITIVE_CIRCLE_SLUGS } from '@/lib/onboarding/constants';
import type { AudienceRole, ContentInterest } from '@/types';

const AUDIENCE_SLUGS: Partial<Record<AudienceRole, string[]>> = {
  healthcare_worker: ['nurses', 'pct-cna', 'doctors', 'memes'],
  healthcare_student: ['student-nurses', 'nurses', 'simple-medical-questions'],
  exploring_career: ['student-nurses', 'simple-medical-questions', 'nurses'],
  caregiver_family: ['simple-medical-questions', 'nurses'],
  here_to_learn: ['simple-medical-questions', 'doctors', 'nurses'],
  stories_humor: ['memes', 'gaming', 'nurses', 'laugh-lab', 'petverse', 'main-character-moments', 'the-drama-room'],
  support_creators: ['nurses', 'memes', 'simple-medical-questions', 'creator-corner'],
};

const INTEREST_SLUGS: Partial<Record<ContentInterest, string[]>> = {
  humor: ['memes', 'gaming', 'laugh-lab', 'petverse'],
  shift_stories: ['nurses', 'confessions'],
  true_stories: ['nurses', 'confessions', 'the-drama-room', 'main-character-moments'],
  education: ['simple-medical-questions', 'doctors'],
  medical_mythbusters: ['simple-medical-questions', 'doctors'],
  career_tips: ['student-nurses', 'simple-medical-questions'],
  new_grad: ['student-nurses', 'nurses'],
  caregiver_support: ['simple-medical-questions', 'nurses'],
  patient_family_guidance: ['simple-medical-questions'],
  live_qa: ['simple-medical-questions', 'doctors'],
  community_conversations: ['nurses', 'simple-medical-questions', 'gaming', 'the-drama-room', 'main-character-moments', 'cozy-corner'],
  behind_the_scenes: ['nurses', 'doctors', 'creator-corner'],
};

function allowSensitiveSlugs(audience: AudienceRole | null, interests: ContentInterest[]): boolean {
  if (audience === 'stories_humor') return true;
  return interests.some((i) => i === 'humor' || i === 'shift_stories' || i === 'true_stories');
}

/**
 * Ranked slug list for onboarding Circle step (deduped, public-safe by default).
 */
export function suggestOnboardingCircleSlugs(input: {
  audienceRole: AudienceRole | null;
  interests: ContentInterest[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? 8;
  const scores = new Map<string, number>();
  const bump = (slug: string, weight: number) => {
    scores.set(slug, (scores.get(slug) ?? 0) + weight);
  };

  if (input.audienceRole) {
    for (const slug of AUDIENCE_SLUGS[input.audienceRole] ?? []) bump(slug, 3);
  }
  for (const interest of input.interests) {
    for (const slug of INTEREST_SLUGS[interest] ?? []) bump(slug, 2);
  }

  const sensitiveOk = allowSensitiveSlugs(input.audienceRole, input.interests);
  const catalogOrder = new Map(ONBOARDING_CIRCLE_CATALOG.map((c, i) => [c.slug, i]));

  return [...scores.entries()]
    .filter(([slug]) => sensitiveOk || !ONBOARDING_SENSITIVE_CIRCLE_SLUGS.has(slug))
    .sort((a, b) => b[1] - a[1] || (catalogOrder.get(a[0]) ?? 99) - (catalogOrder.get(b[0]) ?? 99))
    .map(([slug]) => slug)
    .slice(0, limit);
}

export function labelForOnboardingCircleSlug(slug: string): string {
  return ONBOARDING_CIRCLE_CATALOG.find((c) => c.slug === slug)?.label ?? slug.replace(/-/g, ' ');
}

export function blurbForOnboardingCircleSlug(slug: string): string {
  return ONBOARDING_CIRCLE_CATALOG.find((c) => c.slug === slug)?.blurb ?? 'Join the conversation';
}
