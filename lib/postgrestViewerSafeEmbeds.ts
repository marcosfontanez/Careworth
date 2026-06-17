import { supabase } from '@/lib/supabase';
import {
  PROFILE_SELECT_CREATOR_SUMMARY_BASE,
  PROFILE_SELECT_CREATOR_WITH_FRAME,
} from '@/services/supabase/profileRowMapper';

type CreatorProfileEmbedRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  identity_tags: string[];
  role: string;
  specialty: string;
  city: string;
  state: string;
  is_verified: boolean;
  pulse_tier: string;
  pulse_score_current: number;
  selected_pulse_avatar_frame_id: string | null;
  pulse_avatar_frame: Record<string, unknown> | null;
};

/** Summary-only rows omit frame embed columns — normalize for downstream embed shape. */
function withCreatorFrameEmbedShape(row: Record<string, unknown>): CreatorProfileEmbedRow {
  return {
    id: String(row.id),
    display_name: String(row.display_name ?? ''),
    username: row.username == null ? null : String(row.username),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    identity_tags: Array.isArray(row.identity_tags)
      ? row.identity_tags.map((tag) => String(tag))
      : [],
    role: String(row.role ?? ''),
    specialty: String(row.specialty ?? ''),
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    is_verified: Boolean(row.is_verified),
    pulse_tier: String(row.pulse_tier ?? 'murmur'),
    pulse_score_current: Number(row.pulse_score_current ?? 0),
    selected_pulse_avatar_frame_id:
      row.selected_pulse_avatar_frame_id == null
        ? null
        : String(row.selected_pulse_avatar_frame_id),
    pulse_avatar_frame:
      row.pulse_avatar_frame == null
        ? null
        : (row.pulse_avatar_frame as Record<string, unknown>),
  };
}

/**
 * PostgREST cannot reliably embed `profiles` from `*_viewer_safe` views
 * (definer views + multiple profile FK columns). Strip embeds and hydrate.
 */

function stripEmbedPrefixes(selectSql: string, prefixes: string[]): string {
  let s = selectSql;
  for (const prefix of prefixes) {
    let searchFrom = 0;
    while (searchFrom < s.length) {
      const start = s.indexOf(prefix, searchFrom);
      if (start === -1) break;

      const parenStart = s.indexOf('(', start + prefix.length - 1);
      if (parenStart === -1) {
        searchFrom = start + prefix.length;
        continue;
      }

      let depth = 0;
      let end = parenStart;
      for (; end < s.length; end++) {
        const ch = s[end];
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            end++;
            break;
          }
        }
      }

      let removeStart = start;
      let removeEnd = end;
      const before = s.slice(Math.max(0, removeStart - 1), removeStart);
      const after = s.slice(removeEnd, removeEnd + 1);
      if (before === ',') removeStart--;
      else if (after === ',') removeEnd++;

      s = `${s.slice(0, removeStart)}${s.slice(removeEnd)}`;
      searchFrom = removeStart;
    }
  }

  return s
    .replace(/,\s*,+/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .trim();
}

export function stripProfileEmbeds(selectSql: string): string {
  return stripEmbedPrefixes(selectSql, [
    'profiles!',
    'author:profiles!',
    'author:author_id(',
    'communities(',
    'communities!',
  ]);
}

export async function hydratePostRowsWithProfiles(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.creator_id).filter(Boolean))] as string[];
  if (ids.length === 0) return rows.map((r) => ({ ...r, profiles: null }));

  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
    .in('id', ids);
  if (error) {
    if (__DEV__) {
      console.warn('[hydratePostRowsWithProfiles] frame embed failed, using summary fallback', error.message);
    }
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_CREATOR_SUMMARY_BASE)
      .in('id', ids);
    if (fallback.error) throw fallback.error;
    data = (fallback.data ?? []).map((row) =>
      withCreatorFrameEmbedShape(row as Record<string, unknown>),
    ) as typeof data;
  }

  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profiles: byId.get(r.creator_id) ?? null }));
}

export async function hydrateThreadRowsWithRelations(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const communityIds = [...new Set(rows.map((r) => r.community_id).filter(Boolean))] as string[];
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))] as string[];

  const [commRes, profRes] = await Promise.all([
    communityIds.length
      ? supabase.from('communities').select('id, slug, name').in('id', communityIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    authorIds.length
      ? supabase.from('profiles').select(PROFILE_SELECT_CREATOR_WITH_FRAME).in('id', authorIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (commRes.error) throw commRes.error;

  let profileRows = profRes.data;
  if (profRes.error) {
    if (__DEV__) {
      console.warn('[hydrateThreadRowsWithRelations] frame embed failed, using summary fallback', profRes.error.message);
    }
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_CREATOR_SUMMARY_BASE)
      .in('id', authorIds);
    if (fallback.error) throw fallback.error;
    profileRows = (fallback.data ?? []).map((row) =>
      withCreatorFrameEmbedShape(row as Record<string, unknown>),
    ) as typeof profileRows;
  }

  const commById = new Map((commRes.data ?? []).map((c: any) => [c.id, c]));
  const profById = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    communities: commById.get(r.community_id) ?? null,
    author: profById.get(r.author_id) ?? null,
  }));
}

export async function hydrateReplyRowsWithAuthors(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))] as string[];
  if (authorIds.length === 0) return rows.map((r) => ({ ...r, author: null }));

  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
    .in('id', authorIds);
  if (error) {
    if (__DEV__) {
      console.warn('[hydrateReplyRowsWithAuthors] frame embed failed, using summary fallback', error.message);
    }
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_CREATOR_SUMMARY_BASE)
      .in('id', authorIds);
    if (fallback.error) throw fallback.error;
    data = (fallback.data ?? []).map((row) =>
      withCreatorFrameEmbedShape(row as Record<string, unknown>),
    ) as typeof data;
  }

  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: byId.get(r.author_id) ?? null }));
}

/** @deprecated Column hints are unreliable on definer views — use strip + hydrate. */
export function viewerSafePostSelect(selectSql: string): string {
  return stripProfileEmbeds(selectSql);
}

/** @deprecated Use hydrateReplyRowsWithAuthors instead. */
export function viewerSafeAuthorEmbed(profileSelectSql: string): string {
  return `author:profiles!author_id(${profileSelectSql})`;
}

/** @deprecated Use hydrateThreadRowsWithRelations instead. */
export const VIEWER_SAFE_COMMUNITY_EMBED = 'communities!community_id(id, slug, name)';
