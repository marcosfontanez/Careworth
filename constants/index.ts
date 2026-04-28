import type { Role, Specialty, ContentInterest, ShiftPreference } from '@/types';

export const ROLES: Role[] = [
  'RN', 'CNA', 'PCT', 'LPN', 'LVN',
  'Student Nurse', 'Travel Nurse', 'Charge Nurse', 'Nurse Leader',
];

export const SPECIALTIES: Specialty[] = [
  'ICU', 'Emergency', 'Med Surg', 'Operating Room', 'Telemetry',
  'Pediatrics', 'Labor & Delivery', 'Oncology', 'Cardiac', 'NICU',
  'PACU', 'Home Health', 'Psych', 'Rehab', 'General',
];

export const SHIFT_PREFERENCES: ShiftPreference[] = [
  'Day', 'Night', 'Rotating', 'No Preference',
];

export const CONTENT_INTERESTS: { value: ContentInterest; label: string; icon: string }[] = [
  { value: 'humor', label: 'Humor & Memes', icon: '😂' },
  { value: 'education', label: 'Clinical Education', icon: '📚' },
  { value: 'career_tips', label: 'Career Tips', icon: '💼' },
  { value: 'shift_stories', label: 'Shift Stories', icon: '🏥' },
  { value: 'new_grad', label: 'New Grad Content', icon: '🎓' },
  { value: 'local_jobs', label: 'Local Jobs', icon: '📍' },
  { value: 'travel_nursing', label: 'Travel Nursing', icon: '✈️' },
  { value: 'leadership', label: 'Leadership', icon: '⭐' },
  { value: 'gear_tools', label: 'Gear & Tools', icon: '🩺' },
  { value: 'certifications', label: 'Certifications', icon: '📋' },
];

/** Short bio beside avatar on My Pulse — keep mock layout tight */
export const MY_PULSE_BIO_MAX_LENGTH = 160;

/**
 * Total character budget across ALL neon pills beside avatar / name on My
 * Pulse. This replaces the old "max N pills" cap: the pills live on a
 * single row beside the avatar, so what actually matters is how many
 * characters fit — not how many commas the user typed. Users can choose
 * 2 longer labels or 3–4 short ones as long as the combined text stays
 * within this budget (space permitting). Keep small enough to guarantee
 * a single row on ~390pt-wide devices.
 */
export const MY_PULSE_TAGS_CHAR_BUDGET = 30;

/**
 * Hard safety net on pill count so a user pasting a giant CSV can't
 * blow up the render with 50 empty chips. The real cap users feel is
 * {@link MY_PULSE_TAGS_CHAR_BUDGET} — this is just a defense-in-depth
 * number, intentionally generous.
 */
export const MY_PULSE_MAX_IDENTITY_TAGS = 6;

/**
 * App-wide cap on a single comment / reply body. Mirrored at:
 *   - every comment TextInput (`maxLength` + visual counter)
 *   - server-side check constraint `comments_content_length_300`
 *     (migration `043_comments_soft_delete_and_length_cap.sql`)
 *
 * Keep these three in sync. If you ever raise the cap you must:
 *   1. update this constant
 *   2. update the migration's CHECK constraint
 *   3. validate the constraint after the schema change
 */
export const COMMENT_MAX_LENGTH = 300;

/**
 * Tombstone copy rendered in place of a soft-deleted comment body.
 * Centralised so every comment surface in the app speaks with one voice
 * (post detail, dedicated comments screen, MyPulseItemCard, etc.).
 */
export const COMMENT_DELETED_TOMBSTONE = 'User Removed Their Comment';

/**
 * Max length of a single live-stream chat message. Kept in lockstep with the
 * `stream_messages_content_length_300` CHECK in migration 044. Currently the
 * same as COMMENT_MAX_LENGTH but kept independent so chat can evolve.
 */
export const STREAM_CHAT_MAX_LENGTH = 300;

export { MY_PULSE_LEGEND } from './myPulse';

export const FEED_TABS = [
  { key: 'forYou' as const, label: 'For You' },
  { key: 'following' as const, label: 'Following' },
  { key: 'friends' as const, label: 'Friends' },
  { key: 'topToday' as const, label: 'Top Today' },
];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
