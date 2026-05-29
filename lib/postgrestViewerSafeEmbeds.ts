import { supabase } from '@/lib/supabase';
import { PROFILE_SELECT_CREATOR_WITH_FRAME } from '@/services/supabase/profileRowMapper';

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

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
    .in('id', ids);
  if (error) throw error;

  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
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
  if (profRes.error) throw profRes.error;

  const commById = new Map((commRes.data ?? []).map((c: any) => [c.id, c]));
  const profById = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));

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

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_CREATOR_WITH_FRAME)
    .in('id', authorIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
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
