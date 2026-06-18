import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

/** Server-side circle memberships for the signed-in user. */
export async function fetchJoinedCommunityIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => String(r.community_id));
}

/** Sync Zustand joined-circle ids from `community_members` (safe to call on focus / refresh). */
export async function hydrateJoinedCommunitiesFromServer(userId: string): Promise<string[]> {
  const ids = await fetchJoinedCommunityIds(userId);
  useAppStore.getState().setJoinedCommunityIdsFromServer(ids);
  return ids;
}
