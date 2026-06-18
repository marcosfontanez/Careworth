import { supabase } from '@/lib/supabase';
import type { ProfileBoardFeed } from '@/lib/pulseBoardRetention';
import {
  PULSE_BOARD_OWNER_MANAGEMENT_MAX,
  PULSE_BOARD_PUBLIC_HISTORY_MAX,
} from '@/lib/pulseBoardRetention';
import {
  PROFILE_SELECT_CREATOR_WITH_FRAME,
  profileRowToCreatorSummary,
} from '@/services/supabase/profileRowMapper';
import type { ProfileBoardShoutout } from '@/types';

const LEGACY_BOARD_SELECT =
  'id, profile_owner_id, author_id, body, status, pinned_at, created_at';

function rowToShoutout(row: Record<string, unknown>, author?: ProfileBoardShoutout['author']): ProfileBoardShoutout {
  return {
    id: String(row.id),
    profileOwnerId: String(row.profile_owner_id),
    authorId: String(row.author_id),
    body: String(row.body ?? '').trim(),
    status: (row.status as ProfileBoardShoutout['status']) ?? 'active',
    pinnedAt: (row.pinned_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    author,
  };
}

async function hydrateAuthors(
  rows: Record<string, unknown>[],
): Promise<Map<string, ProfileBoardShoutout['author']>> {
  const authorIds = [...new Set(rows.map((row) => String(row.author_id ?? '')).filter(Boolean))];
  if (authorIds.length === 0) return new Map();

  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
    .in('id', authorIds);

  const map = new Map<string, ProfileBoardShoutout['author']>();
  for (const row of data ?? []) {
    map.set(String((row as { id: string }).id), profileRowToCreatorSummary(row));
  }
  return map;
}

function mapBoardError(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message ?? '')
      : '';
  const lower = msg.toLowerCase();
  if (lower.includes('not authenticated')) return 'Sign in to leave a shoutout.';
  if (lower.includes('self shoutouts')) return "You can't shout out on your own Pulse Board.";
  if (lower.includes('links not allowed')) return 'Links are not allowed in shoutouts yet.';
  if (lower.includes('empty shoutout')) return 'Write a quick shoutout first.';
  if (lower.includes('too long')) return 'That shoutout is too long.';
  if (lower.includes('board disabled')) return 'This Pulse Board is turned off.';
  if (lower.includes('rate limited')) return 'Give it a moment before posting again.';
  if (lower.includes('not allowed')) return "You can't post on this Pulse Board.";
  if (lower.includes('shoutout not found')) return 'That shoutout is no longer available.';
  if (lower.includes('invalid action')) return 'That action is not available.';
  return 'Something went wrong. Please try again.';
}

function buildFeedFromRows(
  rows: Record<string, unknown>[],
  isOwnerView: boolean,
  authors: Map<string, ProfileBoardShoutout['author']>,
): ProfileBoardFeed {
  const shoutouts = rows
    .map((row) => rowToShoutout(row, authors.get(String(row.author_id))))
    .filter((s) => s.body.length > 0);

  const pinned = shoutouts.find((s) => s.pinnedAt) ?? null;
  const unpinned = shoutouts.filter((s) => !s.pinnedAt);

  const visibleUnpinned = isOwnerView
    ? unpinned
    : unpinned.filter((s) => s.status === 'active' && !s.archivedAt);

  const cap = isOwnerView ? PULSE_BOARD_OWNER_MANAGEMENT_MAX : PULSE_BOARD_PUBLIC_HISTORY_MAX;

  return {
    pinned: pinned?.body ? pinned : null,
    items: visibleUnpinned.slice(0, cap),
    isOwnerView,
  };
}

/** Direct table read — works before migration 264 RPC is deployed. */
async function getFeedLegacy(profileOwnerId: string): Promise<ProfileBoardFeed> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnerView = user?.id === profileOwnerId;

  const limit = isOwnerView ? PULSE_BOARD_OWNER_MANAGEMENT_MAX + 1 : PULSE_BOARD_PUBLIC_HISTORY_MAX + 1;

  const { data, error } = await supabase
    .from('profile_board_shoutouts')
    .select(LEGACY_BOARD_SELECT)
    .eq('profile_owner_id', profileOwnerId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.warn('[profileBoardShoutouts.getFeedLegacy]', error.message);
    return { pinned: null, items: [], isOwnerView };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const authors = await hydrateAuthors(rows);
  return buildFeedFromRows(rows, isOwnerView, authors);
}

export const profileBoardShoutoutsService = {
  async getFeed(profileOwnerId: string): Promise<ProfileBoardFeed> {
    const { data, error } = await supabase.rpc('get_profile_board_shoutouts', {
      p_profile_owner_id: profileOwnerId,
    } as never);

    if (error) {
      if (__DEV__) {
        console.warn('[profileBoardShoutouts.getFeed] RPC failed, using legacy select', error.message);
      }
      return getFeedLegacy(profileOwnerId);
    }

    const payload = (data ?? {}) as {
      pinned?: Record<string, unknown> | null;
      items?: Record<string, unknown>[] | null;
      is_owner_view?: boolean;
    };

    const rawRows = [
      ...(payload.pinned ? [payload.pinned] : []),
      ...((payload.items ?? []) as Record<string, unknown>[]),
    ];
    const authors = await hydrateAuthors(rawRows);

    const pinned = payload.pinned
      ? rowToShoutout(payload.pinned, authors.get(String(payload.pinned.author_id)))
      : null;

    const items = ((payload.items ?? []) as Record<string, unknown>[])
      .map((row) => rowToShoutout(row, authors.get(String(row.author_id))))
      .filter((s) => s.body.length > 0);

    return {
      pinned: pinned?.body ? pinned : null,
      items,
      isOwnerView: payload.is_owner_view === true,
    };
  },

  /** @deprecated Use getFeed — kept for callers migrating gradually. */
  async listForProfile(profileOwnerId: string): Promise<ProfileBoardShoutout[]> {
    const feed = await this.getFeed(profileOwnerId);
    return feed.pinned ? [feed.pinned, ...feed.items] : feed.items;
  },

  async post(profileOwnerId: string, body: string): Promise<ProfileBoardShoutout> {
    const { data, error } = await supabase.rpc('post_profile_board_shoutout', {
      p_profile_owner_id: profileOwnerId,
      p_body: body,
    } as never);

    if (error) throw new Error(mapBoardError(error));
    if (!data) throw new Error('Something went wrong. Please try again.');

    const row = data as Record<string, unknown>;
    const authorId = String(row.author_id ?? '');
    let author: ProfileBoardShoutout['author'];
    if (authorId) {
      const { data: authorRow } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
        .eq('id', authorId)
        .maybeSingle();
      if (authorRow) author = profileRowToCreatorSummary(authorRow);
    }

    return {
      id: String(row.id),
      profileOwnerId: String(row.profile_owner_id),
      authorId,
      body: String(row.body ?? '').trim(),
      status: (row.status as ProfileBoardShoutout['status']) ?? 'active',
      pinnedAt: (row.pinned_at as string | null) ?? null,
      archivedAt: (row.archived_at as string | null) ?? null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      author,
    };
  },

  async moderate(
    shoutoutId: string,
    action: 'hide' | 'delete' | 'report' | 'author_delete' | 'pin' | 'unpin',
  ): Promise<void> {
    const { error } = await supabase.rpc('moderate_profile_board_shoutout', {
      p_shoutout_id: shoutoutId,
      p_action: action,
    } as never);
    if (error) throw new Error(mapBoardError(error));
  },
};
