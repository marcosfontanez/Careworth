import { supabase } from '@/lib/supabase';
import type { CircleModerationStatus } from '@/lib/circleModeration';
import { CIRCLE_MODERATION_ACTIVE } from '@/lib/circleModeration';

export type CircleModeratorRow = {
  id: string;
  communityId: string;
  userId: string;
  role: string;
  createdAt: string;
  profile?: { displayName: string; avatarUrl: string | null };
};

function moderationThreadUpdate(
  status: CircleModerationStatus,
  moderatorId: string,
  reason?: string | null,
) {
  const now = new Date().toISOString();
  const hiddenOrRemoved = status === 'hidden' || status === 'removed';
  return {
    moderation_status: status,
    moderated_by: moderatorId,
    moderated_at: now,
    moderation_reason: reason?.trim() || null,
    deleted_at: hiddenOrRemoved ? now : null,
    deleted_by: hiddenOrRemoved ? moderatorId : null,
  };
}

function moderationReplyUpdate(
  status: CircleModerationStatus,
  moderatorId: string,
  reason?: string | null,
) {
  const now = new Date().toISOString();
  return {
    moderation_status: status,
    moderated_by: moderatorId,
    moderated_at: now,
    moderation_reason: reason?.trim() || null,
  };
}

export const circleModerationService = {
  async canModerateCircle(communityId: string): Promise<boolean> {
    const cid = (communityId ?? '').trim();
    if (!cid) return false;
    const { data, error } = await (supabase.rpc as any)('can_moderate_circle', {
      p_community_id: cid,
    });
    if (error) {
      if (__DEV__) console.warn('[circleModeration.canModerateCircle]', error.message);
      return false;
    }
    return data === true;
  },

  async hideThread(threadId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_threads')
      .update(moderationThreadUpdate('hidden', user.id, reason))
      .eq('id', threadId);
    if (error) throw error;
  },

  async removeThread(threadId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_threads')
      .update(moderationThreadUpdate('removed', user.id, reason))
      .eq('id', threadId);
    if (error) throw error;
  },

  async markThreadPendingReview(threadId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('circle_threads')
      .update({
        moderation_status: 'pending_review',
        moderated_by: user.id,
        moderated_at: now,
        moderation_reason: reason?.trim() || 'Queued for moderator review',
        deleted_at: now,
        deleted_by: user.id,
      })
      .eq('id', threadId);
    if (error) throw error;
  },

  async markReplyPendingReview(replyId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('circle_replies')
      .update({
        moderation_status: 'pending_review',
        moderated_by: user.id,
        moderated_at: now,
        moderation_reason: reason?.trim() || 'Queued for moderator review',
      })
      .eq('id', replyId);
    if (error) throw error;
  },

  async restoreThread(threadId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_threads')
      .update({
        moderation_status: CIRCLE_MODERATION_ACTIVE,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_reason: null,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', threadId);
    if (error) throw error;
  },

  async hideReply(replyId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_replies')
      .update(moderationReplyUpdate('hidden', user.id, reason))
      .eq('id', replyId);
    if (error) throw error;
  },

  async removeReply(replyId: string, reason?: string | null): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_replies')
      .update(moderationReplyUpdate('removed', user.id, reason))
      .eq('id', replyId);
    if (error) throw error;
  },

  async restoreReply(replyId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('circle_replies')
      .update({
        moderation_status: CIRCLE_MODERATION_ACTIVE,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_reason: null,
      })
      .eq('id', replyId);
    if (error) throw error;
  },

  async listModerators(communityId: string): Promise<CircleModeratorRow[]> {
    const cid = (communityId ?? '').trim();
    if (!cid) return [];
    const { data, error } = await supabase
      .from('circle_moderators')
      .select(
        'id, community_id, user_id, role, created_at, profile:profiles!circle_moderators_user_id_fkey(display_name, avatar_url)',
      )
      .eq('community_id', cid)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      communityId: row.community_id,
      userId: row.user_id,
      role: row.role,
      createdAt: row.created_at,
      profile: row.profile
        ? {
            displayName: String(row.profile.display_name ?? 'Member'),
            avatarUrl: row.profile.avatar_url ?? null,
          }
        : undefined,
    }));
  },

  async addModerator(communityId: string, userId: string, role: 'moderator' | 'lead_moderator' = 'moderator'): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('circle_moderators').insert({
      community_id: communityId,
      user_id: userId,
      role,
      created_by: user.id,
    });
    if (error) throw error;
  },

  async removeModerator(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('circle_moderators')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
