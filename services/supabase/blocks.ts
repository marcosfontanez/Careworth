import { supabase } from '@/lib/supabase';

export type BlockRelationship = 'none' | 'viewer_blocked' | 'blocked_by_viewer' | 'unknown';

/**
 * Returns how `viewerId` relates to `profileUserId` through `blocked_users`.
 * - viewer_blocked: viewer blocked the profile owner
 * - blocked_by_viewer: profile owner blocked the viewer (viewer should not browse)
 */
export async function getBlockRelationship(
  viewerId: string,
  profileUserId: string,
): Promise<BlockRelationship> {
  if (!viewerId || !profileUserId || viewerId === profileUserId) return 'none';

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(
      `and(blocker_id.eq.${viewerId},blocked_id.eq.${profileUserId}),and(blocker_id.eq.${profileUserId},blocked_id.eq.${viewerId})`,
    )
    .limit(2);

  if (error) {
    if (__DEV__) console.warn('[blocks.getBlockRelationship]', error.message);
    return 'unknown';
  }

  for (const row of data ?? []) {
    const blocker = String((row as { blocker_id: string }).blocker_id);
    const blocked = String((row as { blocked_id: string }).blocked_id);
    if (blocker === viewerId && blocked === profileUserId) return 'viewer_blocked';
    if (blocker === profileUserId && blocked === viewerId) return 'blocked_by_viewer';
  }

  return 'none';
}

/** Insert a row into `blocked_users` (idempotent on duplicate). */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) return;
  const { error } = await supabase.from('blocked_users').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  } as never);
  if (error && (error as { code?: string }).code !== '23505') throw error;
}
