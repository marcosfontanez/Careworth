import { supabase } from '@/lib/supabase';

export type FeedUserAction = 'not_interested' | 'hide_creator';

export const feedSignalsService = {
  async listExclusions(userId: string): Promise<{ hiddenPostIds: Set<string>; hiddenCreatorIds: Set<string> }> {
    const { data, error } = await supabase
      .from('feed_user_actions')
      .select('action, post_id, creator_id')
      .eq('user_id', userId);

    if (error) {
      if (__DEV__) console.warn('[feedSignals.listExclusions]', error.message);
      return { hiddenPostIds: new Set(), hiddenCreatorIds: new Set() };
    }

    const hiddenPostIds = new Set<string>();
    const hiddenCreatorIds = new Set<string>();
    for (const row of data ?? []) {
      const r = row as { action: string; post_id: string | null; creator_id: string | null };
      if (r.action === 'not_interested' && r.post_id) hiddenPostIds.add(r.post_id);
      if (r.action === 'hide_creator' && r.creator_id) hiddenCreatorIds.add(r.creator_id);
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
