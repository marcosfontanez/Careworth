import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { profileHandleDisplay } from '@/utils/profileHandle';
import type { CreatorSummary, Role, Specialty } from '@/types';

type IdentitySource = Pick<CreatorSummary, 'id' | 'displayName' | 'username' | 'firstName' | 'lastName' | 'identityTags' | 'role' | 'specialty'>;

function roleSpecialtyLabel(role?: Role | string | null, specialty?: Specialty | string | null): string | null {
  const r = role?.trim();
  const s = specialty?.trim();
  if (r && s) return `${r} · ${s}`;
  if (r) return r;
  if (s) return s;
  return null;
}

/** Compact healthcare suffix for feed overlay — no extra network calls. */
export function feedCreatorIdentitySuffix(creator: IdentitySource): string {
  const tags = buildNeonPillTags(creator);
  if (tags.length >= 2) return `${tags[0]} · ${tags[1]}`;
  if (tags.length === 1) return tags[0];

  const legacy = roleSpecialtyLabel(creator.role, creator.specialty);
  if (legacy) return legacy;

  return 'Healthcare Creator';
}

/** `@handle` only — neon pills render separately in feed overlay. */
export function feedCreatorHandleOnly(creator: IdentitySource): string {
  return profileHandleDisplay({
    id: creator.id,
    displayName: creator.displayName,
    username: creator.username,
    firstName: creator.firstName ?? '',
    lastName: creator.lastName ?? '',
    role: '',
    specialty: '',
    city: '',
    state: '',
    yearsExperience: 0,
    bio: '',
    avatarUrl: '',
    followerCount: 0,
    followingCount: 0,
    likeCount: 0,
    postCount: 0,
    badges: [],
    communitiesJoined: [],
    privacyMode: 'public',
    interests: [],
    isVerified: false,
    shiftPreference: 'No Preference',
  });
}

/** `@handle · RN · ICU` style line for feed video overlay. */
export function feedCreatorHandleIdentityLine(creator: IdentitySource): string {
  const handle = profileHandleDisplay({
    id: creator.id,
    displayName: creator.displayName,
    username: creator.username,
    firstName: creator.firstName ?? '',
    lastName: creator.lastName ?? '',
    role: '',
    specialty: '',
    city: '',
    state: '',
    yearsExperience: 0,
    bio: '',
    avatarUrl: '',
    followerCount: 0,
    followingCount: 0,
    likeCount: 0,
    postCount: 0,
    badges: [],
    communitiesJoined: [],
    privacyMode: 'public',
    interests: [],
    isVerified: false,
    shiftPreference: 'No Preference',
  });
  const suffix = feedCreatorIdentitySuffix(creator);
  if (suffix === 'Healthcare Creator') return handle;
  return `${handle} · ${suffix}`;
}
