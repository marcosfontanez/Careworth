import { supabase } from '@/lib/supabase';

export type FeedUserAction = 'not_interested' | 'hide_creator';

export const feedSignalsService = {
  async listExclusions(userId: string): Promise<{ hiddenPostIds: Set<string>; hiddenCreatorIds: Set<string> }> {
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

    if (actionsRes.error) {
      if (__DEV__) console.warn('[feedSignals.listExclusions] actions', actionsRes.error.message);
    }
    if (blocksRes.error) {
      if (__DEV__) console.warn('[feedSignals.listExclusions] blocks', blocksRes.error.message);
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
