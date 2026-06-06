import type { WebAudienceRole, WebContentInterest } from "./onboarding-constants";
import {
  WEB_ONBOARDING_CIRCLE_CATALOG,
  WEB_SENSITIVE_CIRCLE_SLUGS,
} from "./onboarding-constants";

const AUDIENCE_SLUGS: Partial<Record<WebAudienceRole, string[]>> = {
  healthcare_worker: ["nurses", "pct-cna", "doctors", "memes"],
  healthcare_student: ["student-nurses", "nurses", "simple-medical-questions"],
  exploring_career: ["student-nurses", "simple-medical-questions", "nurses"],
  caregiver_family: ["simple-medical-questions", "nurses"],
  here_to_learn: ["simple-medical-questions", "doctors", "nurses"],
  stories_humor: ["memes", "gaming", "nurses"],
  support_creators: ["nurses", "memes", "simple-medical-questions"],
};

const INTEREST_SLUGS: Partial<Record<WebContentInterest, string[]>> = {
  humor: ["memes", "gaming"],
  shift_stories: ["nurses", "confessions"],
  true_stories: ["nurses", "confessions"],
  education: ["simple-medical-questions", "doctors"],
  medical_mythbusters: ["simple-medical-questions", "doctors"],
  career_tips: ["student-nurses", "simple-medical-questions"],
  new_grad: ["student-nurses", "nurses"],
  caregiver_support: ["simple-medical-questions", "nurses"],
  patient_family_guidance: ["simple-medical-questions"],
  live_qa: ["simple-medical-questions", "doctors"],
  community_conversations: ["nurses", "simple-medical-questions", "gaming"],
  behind_the_scenes: ["nurses", "doctors"],
};

function allowSensitiveSlugs(audience: WebAudienceRole | null, interests: WebContentInterest[]): boolean {
  if (audience === "stories_humor") return true;
  return interests.some((i) => i === "humor" || i === "shift_stories" || i === "true_stories");
}

export function suggestWebOnboardingCircleSlugs(input: {
  audienceRole: WebAudienceRole | null;
  interests: WebContentInterest[];
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
  const catalogOrder = new Map(WEB_ONBOARDING_CIRCLE_CATALOG.map((c, i) => [c.slug, i]));

  return [...scores.entries()]
    .filter(([slug]) => sensitiveOk || !WEB_SENSITIVE_CIRCLE_SLUGS.has(slug))
    .sort((a, b) => b[1] - a[1] || (catalogOrder.get(a[0]) ?? 99) - (catalogOrder.get(b[0]) ?? 99))
    .map(([slug]) => slug)
    .slice(0, limit);
}

export function labelForWebOnboardingCircleSlug(slug: string): string {
  return WEB_ONBOARDING_CIRCLE_CATALOG.find((c) => c.slug === slug)?.label ?? slug.replace(/-/g, " ");
}

export function blurbForWebOnboardingCircleSlug(slug: string): string {
  return WEB_ONBOARDING_CIRCLE_CATALOG.find((c) => c.slug === slug)?.blurb ?? "Join the conversation";
}

const SAFETY_AUDIENCES = new Set<WebAudienceRole>([
  "caregiver_family",
  "here_to_learn",
  "exploring_career",
]);

const SAFETY_INTERESTS = new Set<WebContentInterest>([
  "education",
  "caregiver_support",
  "patient_family_guidance",
  "medical_mythbusters",
  "live_qa",
]);

export function webNeedsMedicalSafetyStep(input: {
  audienceRole: WebAudienceRole | null;
  interests: WebContentInterest[];
}): boolean {
  if (input.audienceRole && SAFETY_AUDIENCES.has(input.audienceRole)) return true;
  return input.interests.some((i) => SAFETY_INTERESTS.has(i));
}

export function webIsHealthcareProfessionalPath(audienceRole: WebAudienceRole | null): boolean {
  return audienceRole === "healthcare_worker" || audienceRole === "healthcare_student";
}
