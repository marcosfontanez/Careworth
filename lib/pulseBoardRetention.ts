import type { ProfileBoardShoutout } from '@/types';

/** Max floating bubbles rendered at once (3–4). */
export const PULSE_BOARD_FLOATING_VISIBLE_SLOTS = 4;

/** Latest unpinned shoutouts considered for the floating rotation pool. */
export const PULSE_BOARD_FLOATING_POOL_MAX = 12;

/** Prevent one author from dominating the floating pool. */
export const PULSE_BOARD_FLOATING_MAX_PER_AUTHOR = 2;

/** Visitor / public static history cap. */
export const PULSE_BOARD_PUBLIC_HISTORY_MAX = 30;

/** Owner moderation browse cap (includes archived). */
export const PULSE_BOARD_OWNER_MANAGEMENT_MAX = 100;

/** Unpinned shoutouts older than this are archived from public display. */
export const PULSE_BOARD_ARCHIVE_AFTER_DAYS = 90;

export type ProfileBoardFeed = {
  pinned: ProfileBoardShoutout | null;
  items: ProfileBoardShoutout[];
  isOwnerView: boolean;
};

/** Accept legacy cached arrays and partial RPC payloads without crashing. */
export function coerceProfileBoardFeed(raw: unknown): ProfileBoardFeed | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    const pinned = raw.find((s) => s.pinnedAt) ?? null;
    const items = pinned ? raw.filter((s) => s.id !== pinned.id) : raw;
    return { pinned, items, isOwnerView: false };
  }

  if (typeof raw !== 'object') return null;

  const record = raw as Partial<ProfileBoardFeed>;
  const items = Array.isArray(record.items) ? record.items : [];
  const pinned =
    record.pinned && typeof record.pinned === 'object' ? record.pinned : items.find((s) => s.pinnedAt) ?? null;

  return {
    pinned,
    items: pinned ? items.filter((s) => s.id !== pinned.id) : items,
    isOwnerView: record.isOwnerView === true,
  };
}

export function isPulseBoardPubliclyVisible(shoutout: ProfileBoardShoutout): boolean {
  if (shoutout.status !== 'active') return false;
  if (shoutout.archivedAt) return false;
  return true;
}

/**
 * Build the floating rotation pool from unpinned shoutouts (newest first).
 * Caps at 12 total and max 2 per author.
 */
export function buildPulseBoardFloatingPool(
  unpinned: ProfileBoardShoutout[],
): ProfileBoardShoutout[] {
  const pool: ProfileBoardShoutout[] = [];
  const authorCounts = new Map<string, number>();

  for (const shoutout of unpinned) {
    if (!isPulseBoardPubliclyVisible(shoutout)) continue;
    if (pool.length >= PULSE_BOARD_FLOATING_POOL_MAX) break;

    const authorKey = shoutout.authorId?.trim() || shoutout.id;
    const used = authorCounts.get(authorKey) ?? 0;
    if (used >= PULSE_BOARD_FLOATING_MAX_PER_AUTHOR) continue;

    pool.push(shoutout);
    authorCounts.set(authorKey, used + 1);
  }

  return pool;
}

export function splitPulseBoardDisplay(
  feed: ProfileBoardFeed | ProfileBoardShoutout[] | null | undefined,
  isOwner: boolean,
): {
  pinnedShoutout: ProfileBoardShoutout | null;
  rotatingShoutouts: ProfileBoardShoutout[];
  staticShoutouts: ProfileBoardShoutout[];
} {
  const normalized = coerceProfileBoardFeed(feed);
  if (!normalized) {
    return { pinnedShoutout: null, rotatingShoutouts: [], staticShoutouts: [] };
  }

  const unpinned = normalized.items.filter((s) => !s.pinnedAt);
  const rotatingShoutouts = buildPulseBoardFloatingPool(unpinned);

  const staticShoutouts = isOwner
    ? unpinned.slice(0, PULSE_BOARD_OWNER_MANAGEMENT_MAX)
    : unpinned.filter(isPulseBoardPubliclyVisible).slice(0, PULSE_BOARD_PUBLIC_HISTORY_MAX);

  return {
    pinnedShoutout: normalized.pinned,
    rotatingShoutouts,
    staticShoutouts,
  };
}
