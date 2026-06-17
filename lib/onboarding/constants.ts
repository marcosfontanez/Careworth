import type { AudienceRole, ContentInterest, CreatorAudienceTag } from '@/types';

/** Step 1 — why the user is joining (not a verified credential). */
export const AUDIENCE_ROLE_OPTIONS: {
  value: AudienceRole;
  label: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    value: 'healthcare_worker',
    label: 'I work in healthcare',
    subtitle: 'Clinicians, nurses, techs, and allied health on the floor',
    icon: 'medkit-outline',
  },
  {
    value: 'healthcare_student',
    label: "I'm studying healthcare",
    subtitle: 'Nursing, pre-med, allied health, and clinical programs',
    icon: 'school-outline',
  },
  {
    value: 'exploring_career',
    label: "I'm exploring a healthcare career",
    subtitle: 'Curious about paths, day-in-the-life, and real talk',
    icon: 'compass-outline',
  },
  {
    value: 'caregiver_family',
    label: "I'm a caregiver or family member",
    subtitle: 'Supporting someone you love through care journeys',
    icon: 'heart-outline',
  },
  {
    value: 'here_to_learn',
    label: "I'm here to learn",
    subtitle: 'General education, myth-busting, and community wisdom',
    icon: 'book-outline',
  },
  {
    value: 'stories_humor',
    label: "I'm here for stories and humor",
    subtitle: 'Shift stories, memes, and the lighter side of healthcare',
    icon: 'happy-outline',
  },
  {
    value: 'support_creators',
    label: "I'm here to support creators",
    subtitle: 'Follow healthcare voices, live rooms, and Pulse Pages',
    icon: 'sparkles-outline',
  },
];

/** Step 2 — maps to {@link ContentInterest} stored in user_interests. */
export const ONBOARDING_INTEREST_OPTIONS: {
  feedKey: ContentInterest;
  label: string;
  icon: string;
}[] = [
  { feedKey: 'shift_stories', label: 'Real healthcare stories', icon: '📖' },
  { feedKey: 'humor', label: 'Healthcare humor', icon: '😂' },
  { feedKey: 'education', label: 'General education', icon: '📚' },
  { feedKey: 'career_tips', label: 'Career exploration', icon: '🧭' },
  { feedKey: 'caregiver_support', label: 'Caregiver support', icon: '🤝' },
  { feedKey: 'behind_the_scenes', label: 'Behind the scenes', icon: '🎬' },
  { feedKey: 'community_conversations', label: 'Community conversations', icon: '💬' },
  { feedKey: 'live_qa', label: 'Live Q&A', icon: '🎙️' },
  { feedKey: 'medical_mythbusters', label: 'Medical mythbusters', icon: '🔬' },
  { feedKey: 'new_grad', label: 'Student life', icon: '🎓' },
  { feedKey: 'patient_family_guidance', label: 'Patient & family guidance', icon: '🏠' },
  { feedKey: 'true_stories', label: 'True stories / case discussions', icon: '🩺' },
];

export const ONBOARDING_INTEREST_MIN = 0;
export const ONBOARDING_INTEREST_SUGGESTED_MAX = 7;

/** Step 3 — curated public-safe starter Circles (slug → display label). */
export const ONBOARDING_CIRCLE_CATALOG: { slug: string; label: string; blurb: string }[] = [
  { slug: 'simple-medical-questions', label: 'Ask Healthcare Workers', blurb: 'General questions & community education' },
  { slug: 'memes', label: 'Healthcare Humor', blurb: 'Memes and lighter shift culture' },
  { slug: 'student-nurses', label: 'Future Nurses', blurb: 'Students and new grads finding their path' },
  { slug: 'nurses', label: 'Nursing Community', blurb: 'Stories, support, and nursing culture' },
  { slug: 'doctors', label: 'Physicians & Residents', blurb: 'Clinical conversations for physicians' },
  { slug: 'pct-cna', label: 'PCT & CNA Corner', blurb: 'Frontline care team community' },
  { slug: 'gaming', label: 'Healthcare Gaming', blurb: 'Wind down with fellow healthcare people' },
  // General-public Circles (open to everyone — listed after healthcare so ties keep healthcare first).
  { slug: 'petverse', label: 'PetVerse', blurb: 'Pets, funny animal moments, and chaotic pet energy' },
  { slug: 'foodie-finds', label: 'Foodie Finds', blurb: 'Best bites, hidden gems, and meals worth sharing' },
  { slug: 'main-character-moments', label: 'Main Character Moments', blurb: 'Everyday stories that felt like a movie scene' },
  { slug: 'the-drama-room', label: 'The Drama Room', blurb: 'Storytime, tea, and opinions — without naming names' },
  { slug: 'laugh-lab', label: 'Laugh Lab', blurb: 'Skits, memes, fails, and jokes that actually land' },
  { slug: 'diy-home-glow', label: 'DIY & Home Glow', blurb: 'Small upgrades, big transformations' },
  { slug: 'fandom-lounge', label: 'Fandom Lounge', blurb: 'Reactions, theories, favorites, and fandom chaos' },
  { slug: 'creator-corner', label: 'Creator Corner', blurb: 'For creators building better content' },
  { slug: 'travel-mode', label: 'Travel Mode', blurb: 'Trips, hidden gems, and places worth saving' },
  { slug: 'money-moves', label: 'Money Moves', blurb: 'Save smarter, earn better, and share the lessons' },
  { slug: 'cozy-corner', label: 'Cozy Corner', blurb: 'Comfort content, calm routines, and cozy resets' },
  { slug: 'glow-up-garage', label: 'Glow Up Garage', blurb: 'Before, after, and everything in between' },
];

/** Slugs excluded unless user picks stories/humor audience or interest. */
export const ONBOARDING_SENSITIVE_CIRCLE_SLUGS = new Set(['confessions', 'shift-confessions']);

export const CREATOR_AUDIENCE_TAG_OPTIONS: {
  value: CreatorAudienceTag;
  label: string;
}[] = [
  { value: 'healthcare_workers', label: 'Healthcare workers' },
  { value: 'students', label: 'Students' },
  { value: 'caregivers', label: 'Caregivers' },
  { value: 'patients_families', label: 'Patients & families' },
  { value: 'curious_learners', label: 'Curious learners' },
  { value: 'comedy_fans', label: 'Comedy fans' },
  { value: 'live_audiences', label: 'Live audiences' },
];

export const MEDICAL_SAFETY_DISCLAIMER =
  'PulseVerse is for stories, education, and community. It does not replace medical advice, diagnosis, treatment, or emergency care.';

export const MEDICAL_SAFETY_CHECKBOX =
  'I understand PulseVerse is not a substitute for professional medical care.';

export const PUBLIC_QUESTION_GUARDRAIL =
  'Ask general questions and learn from the community. For personal medical advice, diagnosis, treatment, or emergencies, contact a qualified clinician or emergency services.';
