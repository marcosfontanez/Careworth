/**
 * Public @handle content rules (reserved / impersonation / coarse profanity & hate).
 * Keep lists in sync with `supabase/migrations/103_username_handle_content_policy.sql`.
 */

/** Segments split on . or _ must not exactly match (lowercase). */
export const USERNAME_BLOCKED_EXACT_TOKENS: readonly string[] = [
  // Impersonation / staff-like
  'mod',
  'moderator',
  'moderators',
  'support',
  'official',
  'staff',
  'verified',
  'security',
  'root',
  'system',
  'helpdesk',
  'administrator',
  'pulsestaff',
  'custodian',
  // Coarse profanity & slurs (single-token; extend via migration as needed)
  'fuck',
  'fucks',
  'fucked',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'shits',
  'shitty',
  'bitch',
  'bitches',
  'whore',
  'whores',
  'slut',
  'sluts',
  'cunt',
  'cunts',
  'dick',
  'dicks',
  'dickhead',
  'cock',
  'cocks',
  'pussy',
  'porn',
  'porno',
  'pedo',
  'rape',
  'rapist',
  'nazi',
  'nazis',
  'kkk',
  'isis',
  'coon',
  'spic',
  'cum',
  'jizz',
  'bollocks',
  'bastard',
  'wanker',
  'twat',
];

/**
 * After removing "." and "_", the handle must not contain these substrings (lowercase).
 * Use length ≥ 5 to avoid everyday words (e.g. "rape" inside "grape").
 */
export const USERNAME_BLOCKED_COMPACT_SUBSTRINGS: readonly string[] = [
  'nigger',
  'nigga',
  'faggot',
  'faggit',
  'chink',
  'retard',
  'hitler',
  'genocide',
  'terrorist',
  'pedoph',
  'necroph',
  'bestial',
];

const EXACT = new Set(USERNAME_BLOCKED_EXACT_TOKENS);

function segments(handleLower: string): string[] {
  return handleLower.split(/[._]+/).filter(Boolean);
}

function compact(handleLower: string): string {
  return handleLower.replace(/[._]+/g, '');
}

/**
 * @param normalized — trimmed, lowercase handle (grammar need not be validated here).
 */
export function usernamePassesContentPolicy(normalized: string): boolean {
  const s = normalized.trim().toLowerCase();
  if (!s) return false;

  const c = compact(s);
  if (c.includes('pulseverse') || s.includes('pulseverse')) return false;

  for (const seg of segments(s)) {
    if (seg.startsWith('admin')) return false;
  }

  for (const seg of segments(s)) {
    if (EXACT.has(seg)) return false;
  }

  for (const sub of USERNAME_BLOCKED_COMPACT_SUBSTRINGS) {
    if (c.includes(sub)) return false;
  }

  return true;
}
