/**
 * Curated discovery order for Circles home. Communities must exist in DB with these slugs
 * (seed your `communities` table accordingly).
 */
/** Starter “rooms” on Circles home — order matches horizontal carousel (subreddit-style communities). */
export const FEATURED_CIRCLE_SLUGS_ORDER = [
  'memes',
  'confessions',
  'nurses',
  'pct-cna',
  'doctors',
  'pharmacists',
  'therapy',
] as const;

export const NEW_CIRCLE_SLUGS = [
  'student-rn-support',
  'burnout-boundaries',
  'cardiology-cases',
  'travel-housing-tips',
  'healthcare-book-club',
  'code-blue-stories',
] as const;
