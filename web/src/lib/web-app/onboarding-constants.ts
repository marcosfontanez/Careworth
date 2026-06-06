/** Web onboarding — mirrors native lib/onboarding/constants (subset used by wizard). */

export type WebAudienceRole =
  | "healthcare_worker"
  | "healthcare_student"
  | "exploring_career"
  | "caregiver_family"
  | "here_to_learn"
  | "stories_humor"
  | "support_creators";

export type WebContentInterest =
  | "humor"
  | "education"
  | "career_tips"
  | "shift_stories"
  | "new_grad"
  | "caregiver_support"
  | "behind_the_scenes"
  | "community_conversations"
  | "live_qa"
  | "medical_mythbusters"
  | "patient_family_guidance"
  | "true_stories";

export const WEB_AUDIENCE_ROLE_OPTIONS: {
  value: WebAudienceRole;
  label: string;
  subtitle: string;
}[] = [
  {
    value: "healthcare_worker",
    label: "I work in healthcare",
    subtitle: "Clinicians, nurses, techs, and allied health on the floor",
  },
  {
    value: "healthcare_student",
    label: "I'm studying healthcare",
    subtitle: "Nursing, pre-med, allied health, and clinical programs",
  },
  {
    value: "exploring_career",
    label: "I'm exploring a healthcare career",
    subtitle: "Curious about paths, day-in-the-life, and real talk",
  },
  {
    value: "caregiver_family",
    label: "I'm a caregiver or family member",
    subtitle: "Supporting someone you love through care journeys",
  },
  {
    value: "here_to_learn",
    label: "I'm here to learn",
    subtitle: "General education, myth-busting, and community wisdom",
  },
  {
    value: "stories_humor",
    label: "I'm here for stories and humor",
    subtitle: "Shift stories, memes, and the lighter side of healthcare",
  },
  {
    value: "support_creators",
    label: "I'm here to support creators",
    subtitle: "Follow healthcare voices, live rooms, and Pulse Pages",
  },
];

export const WEB_ONBOARDING_INTEREST_OPTIONS: {
  feedKey: WebContentInterest;
  label: string;
}[] = [
  { feedKey: "shift_stories", label: "Real healthcare stories" },
  { feedKey: "humor", label: "Healthcare humor" },
  { feedKey: "education", label: "General education" },
  { feedKey: "career_tips", label: "Career exploration" },
  { feedKey: "caregiver_support", label: "Caregiver support" },
  { feedKey: "behind_the_scenes", label: "Behind the scenes" },
  { feedKey: "community_conversations", label: "Community conversations" },
  { feedKey: "live_qa", label: "Live Q&A" },
  { feedKey: "medical_mythbusters", label: "Medical mythbusters" },
  { feedKey: "new_grad", label: "Student life" },
  { feedKey: "patient_family_guidance", label: "Patient & family guidance" },
  { feedKey: "true_stories", label: "True stories / case discussions" },
];

export const WEB_ONBOARDING_INTEREST_MAX = 7;

export const WEB_ONBOARDING_CIRCLE_CATALOG: { slug: string; label: string; blurb: string }[] = [
  { slug: "simple-medical-questions", label: "Ask Healthcare Workers", blurb: "General questions & community education" },
  { slug: "memes", label: "Healthcare Humor", blurb: "Memes and lighter shift culture" },
  { slug: "student-nurses", label: "Future Nurses", blurb: "Students and new grads finding their path" },
  { slug: "nurses", label: "Nursing Community", blurb: "Stories, support, and nursing culture" },
  { slug: "doctors", label: "Physicians & Residents", blurb: "Clinical conversations for physicians" },
  { slug: "pct-cna", label: "PCT & CNA Corner", blurb: "Frontline care team community" },
  { slug: "gaming", label: "Healthcare Gaming", blurb: "Wind down with fellow healthcare people" },
];

export const WEB_SENSITIVE_CIRCLE_SLUGS = new Set(["confessions", "shift-confessions"]);

export const WEB_MEDICAL_SAFETY_DISCLAIMER =
  "PulseVerse is for stories, education, and community. It does not replace medical advice, diagnosis, treatment, or emergency care.";

export const WEB_MEDICAL_SAFETY_CHECKBOX =
  "I understand PulseVerse is not a substitute for professional medical care.";
