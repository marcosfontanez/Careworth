import { supabase } from '@/lib/supabase';

export type FeedUserAction = 'not_interested' | 'hide_creator';

function setsFromRpcPayload(data: unknown): { hiddenPostIds: Set<string>; hiddenCreatorIds: Set<string> } | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as { hidden_post_ids?: unknown; hidden_creator_ids?: unknown };
  const hp = Array.isArray(o.hidden_post_ids) ? o.hidden_post_ids : null;
  const hc = Array.isArray(o.hidden_creator_ids) ? o.hidden_creator_ids : null;
  if (!hp || !hc) return null;
  return {
    hiddenPostIds: new Set(hp.map((x) => String(x))),
    hiddenCreatorIds: new Set(hc.map((x) => String(x))),
  };
}

/** Legacy two-query path if `get_feed_exclusions` RPC is not deployed. */
async function listExclusionsLegacy(userId: string): Promise<{
  hiddenPostIds: Set<string>;
  hiddenCreatorIds: Set<string>;
}> {
  const [actionsRes, blocksRes] = await Promise.all([
    supabase
      .from('feed_user_actions')
      .select('action, post_id, creator_id')
      .eq('user_id', userId),
    supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
  ]);

  if (actionsRes.error && __DEV__) {
    console.warn('[feedSignals.listExclusions] actions', actionsRes.error.message);
  }
  if (blocksRes.error && __DEV__) {
    console.warn('[feedSignals.listExclusions] blocks', blocksRes.error.message);
  }

  const hiddenPostIds = new Set<string>();
  const hiddenCreatorIds = new Set<string>();
  for (const row of actionsRes.data ?? []) {
    const r = row as { action: string; post_id: string | null; creator_id: string | null };
    if (r.action === 'not_interested' && r.post_id) hiddenPostIds.add(r.post_id);
    if (r.action === 'hide_creator' && r.creator_id) hiddenCreatorIds.add(r.creator_id);
  }
  for (const row of blocksRes.data ?? []) {
    const r = row as { blocker_id: string; blocked_id: string };
    if (r.blocker_id === userId) hiddenCreatorIds.add(r.blocked_id);
    else if (r.blocked_id === userId) hiddenCreatorIds.add(r.blocker_id);
  }
  return { hiddenPostIds, hiddenCreatorIds };
}

export const feedSignalsService = {
  async listExclusions(userId: string): Promise<{ hiddenPostIds: Set<string>; hiddenCreatorIds: Set<string> }> {
    if (!userId) return { hiddenPostIds: new Set(), hiddenCreatorIds: new Set() };

    const { data, error } = await supabase.rpc('get_feed_exclusions', { viewer_uuid: userId });
    if (!error) {
      const parsed = setsFromRpcPayload(data);
      if (parsed) return parsed;
    } else if (__DEV__) {
      console.warn('[feedSignals.listExclusions] rpc', error.message);
    }

    return listExclusionsLegacy(userId);
  },

  async recordAction(
    userId: string,
    action: FeedUserAction,
    opts: { postId?: string; creatorId?: string },
  ): Promise<void> {
    if (action === 'not_interested') {
      if (!opts.postId) return;
      const { error } = await supabase.from('feed_user_actions').insert({
        user_id: userId,
        action: 'not_interested',
        post_id: opts.postId,
        creator_id: null,
      } as never);
      if (error && (error as { code?: string }).code !== '23505') throw error;
      return;
    }
    if (!opts.creatorId) return;
    const { error } = await supabase.from('feed_user_actions').insert({
      user_id: userId,
      action: 'hide_creator',
      post_id: null,
      creator_id: opts.creatorId,
    } as never);
    if (error && (error as { code?: string }).code !== '23505') throw error;
  },
};
