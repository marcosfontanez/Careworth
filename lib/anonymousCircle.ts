/** Circles where thread/reply identity is shown only as stable pseudonyms (no profile links). */
export const ANONYMOUS_CONFESSION_SLUGS = ['confessions'] as const;

export function isAnonymousConfessionCircle(slug: string | undefined | null): boolean {
  if (!slug) return false;
  const s = slug.trim().toLowerCase();
  return (ANONYMOUS_CONFESSION_SLUGS as readonly string[]).includes(s);
}

/**
 * Whether a post’s author should be masked in UI.
 * Uses DB `is_anonymous` and/or opening context (`?circle=`) for anonymous rooms.
 */
export function postShouldMaskIdentity(
  post: { isAnonymous?: boolean },
  circleSlugFromQuery: string | string[] | undefined,
): boolean {
  if (post.isAnonymous === true) return true;
  const raw = Array.isArray(circleSlugFromQuery) ? circleSlugFromQuery[0] : circleSlugFromQuery;
  const slug = raw?.trim();
  if (slug && isAnonymousConfessionCircle(slug)) return true;
  return false;
}

const ADJECTIVES = [
  'Quiet', 'Swift', 'Calm', 'Bright', 'Gentle', 'Bold', 'Kind', 'Wise', 'Steady', 'Soft',
  'Cosmic', 'Neon', 'Velvet', 'Silver', 'Golden', 'Midnight', 'Sunny', 'Misty', 'Brave', 'Clever',
  'Curious', 'Sleepy', 'Lucky', 'Mellow', 'Electric', 'Hidden', 'Wild', 'Serene', 'Fierce', 'Humble',
  'Nimble', 'Noble', 'Playful', 'Silent', 'Radiant', 'Dusky', 'Crystal', 'Stormy', 'Icy', 'Warm',
];

const NOUNS = [
  'Owl', 'Robin', 'Heron', 'Fox', 'Raven', 'Lark', 'Jay', 'Wren', 'Finch', 'Dove',
  'Otter', 'Panda', 'Koala', 'Lynx', 'Badger', 'Hawk', 'Swan', 'Crane', 'Seal', 'Wolf',
  'Comet', 'Nova', 'Pebble', 'River', 'Cedar', 'Willow', 'Maple', 'Brook', 'Summit', 'Echo',
  'Cipher', 'Pixel', 'Shadow', 'Beacon', 'Drift', 'Pulse', 'Glyph', 'Quartz', 'Nimbus', 'Aurora',
];

function hash32(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Stable pseudonym for an author within one thread (circle discussion).
 * Not derived from profile — cannot be reversed to a handle from the label alone.
 */
export function anonymousDisplayName(authorId: string, threadId: string): string {
  const h = hash32(`${authorId}:${threadId}`);
  return `Anonymous ${ADJECTIVES[h % ADJECTIVES.length]} ${NOUNS[(h >> 4) % NOUNS.length]}`;
}

/** Same formula as threads: stable per author + post id for circle wall posts. */
export function anonymousNameOnPost(authorId: string, postId: string): string {
  return anonymousDisplayName(authorId, postId);
}
