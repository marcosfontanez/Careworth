import type { CreatorSummary } from '@/types';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';

/**
 * Columns that satisfy {@link profileRowToCreatorSummary} (plus frame embed).
 * Use inside `author:author_id(<this>)` and similar `profiles` FK selects.
 */
export const PROFILE_SELECT_CREATOR_SUMMARY_BASE =
  'id, display_name, username, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current';

/** Must match `profiles.selected_pulse_avatar_frame_id` FK hint. */
export const PROFILE_SELECT_PULSE_AVATAR_FRAME_EMBED =
  'selected_pulse_avatar_frame_id, pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(id, slug, label, subtitle, prize_tier, month_start, ring_color, glow_color, ring_caption)';

export const PROFILE_SELECT_CREATOR_WITH_FRAME = `${PROFILE_SELECT_CREATOR_SUMMARY_BASE}, ${PROFILE_SELECT_PULSE_AVATAR_FRAME_EMBED}`;

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
  const base = Array.isArray(row) ? row[0] : row;
  if (base == null || typeof base !== 'object') {
    return unknownCreatorSummary('');
  }

  let pulseRaw = base.pulse_avatar_frame;
  if (Array.isArray(pulseRaw)) {
    pulseRaw = pulseRaw.length > 0 ? pulseRaw[0] : null;
  }
  const pulseAvatarFrame =
    pulseRaw === undefined
      ? undefined
      : mapPulseAvatarFrameEmbed(pulseRaw) ?? null;

  return {
    id: base.id,
    displayName: base.display_name ?? 'Unknown',
    username: base.username?.trim() ? String(base.username).toLowerCase() : undefined,
    firstName: base.first_name ?? undefined,
    lastName: base.last_name ?? undefined,
    avatarUrl: base.avatar_url ?? '',
    role: base.role,
    specialty: base.specialty,
    city: base.city ?? '',
    state: base.state ?? '',
    isVerified: Boolean(base.is_verified),
    // Denormalized Pulse Score v2 fields (migration 059). Defaulting
    // to 'murmur' / 0 keeps every downstream consumer type-safe
    // without forcing callers to handle null tiers.
    pulseTier: typeof base.pulse_tier === 'string' ? base.pulse_tier : 'murmur',
    pulseScoreCurrent:
      typeof base.pulse_score_current === 'number' ? base.pulse_score_current : 0,
    selectedPulseAvatarFrameId:
      base.selected_pulse_avatar_frame_id != null
        ? String(base.selected_pulse_avatar_frame_id)
        : base.selected_pulse_avatar_frame_id === null
          ? null
          : undefined,
    pulseAvatarFrame,
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
