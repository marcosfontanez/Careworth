import type { CreatorSummary } from '@/types';

/**
 * Canonical `profiles` row → `CreatorSummary` mapper.
 *
 * This is the single source of truth. Previously there were three
 * near-identical mappers (`rowToCreator` in posts.ts, `authorFromRow` in
 * circleThreadsDb.ts, `hostFromRow` in streamsLive.ts). They drifted:
 * `authorFromRow` silently omitted `pulse_tier` / `pulse_score_current`,
 * so Circle post authors never rendered the Pulse tier badge even
 * though the column was selected and the badge component was mounted.
 *
 * Anything that joins `profiles` (or selects a subset of the same
 * columns) should pass the joined row through this function.
 *
 * @param row - Raw row from the `profiles` table. We accept `any` here
 *              because callers pass shapes from different joins with
 *              different column subsets. The function tolerates missing
 *              fields by falling back to sensible defaults.
 */
export function profileRowToCreatorSummary(row: any): CreatorSummary {
  return {
    id: row.id,
    displayName: row.display_name ?? 'Unknown',
    username: row.username?.trim() ? String(row.username).toLowerCase() : undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    avatarUrl: row.avatar_url ?? '',
    role: row.role,
    specialty: row.specialty,
    city: row.city ?? '',
    state: row.state ?? '',
    isVerified: Boolean(row.is_verified),
    // Denormalized Pulse Score v2 fields (migration 059). Defaulting
    // to 'murmur' / 0 keeps every downstream consumer type-safe
    // without forcing callers to handle null tiers.
    pulseTier: typeof row.pulse_tier === 'string' ? row.pulse_tier : 'murmur',
    pulseScoreCurrent:
      typeof row.pulse_score_current === 'number' ? row.pulse_score_current : 0,
  };
}

/**
 * Returns a minimal "deleted / unresolvable creator" placeholder. Used
 * by list mappers when the joined profile row is missing (e.g. the
 * creator was deleted and their FK nulled out, but the post row still
 * exists) so downstream UI never has to branch on an optional creator.
 */
export function unknownCreatorSummary(id: string = ''): CreatorSummary {
  return {
    id,
    displayName: 'Unknown',
    avatarUrl: '',
    role: 'RN',
    specialty: 'General',
    city: '',
    state: '',
    isVerified: false,
    pulseTier: 'murmur',
    pulseScoreCurrent: 0,
  };
}
