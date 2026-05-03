/**
 * Curated discovery order for Circles home. Communities must exist in DB with these slugs
 * (seed your `communities` table accordingly).
 */
/** Starter “rooms” on Circles home — order matches horizontal carousel (subreddit-style communities). */
export const FEATURED_CIRCLE_SLUGS_ORDER = [
  'bug-reports',
  'memes',
  'border-envy',
  'confessions',
  'nurses',
  'student-nurses',
  'pct-cna',
  'doctors',
  'simple-medical-questions',
  'gaming',
] as const;

/** Always surfaced first in Circles “New circles” (then backfill from recently created). */
export const PROMOTED_NEW_CIRCLE_SLUGS = [
  'border-envy',
  'simple-medical-questions',
  'student-nurses',
  'gaming',
] as const;

export const NEW_CIRCLE_SLUGS = [
  'student-rn-support',
  'burnout-boundaries',
  'cardiology-cases',
  'travel-housing-tips',
  'healthcare-book-club',
  'code-blue-stories',
] as const;
