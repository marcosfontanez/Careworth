import type { NotificationItem, CreatorSummary } from '@/types';
import { supabase } from '@/lib/supabase';
import { getMutedCommunityIds } from '@/lib/circleExperience';
import {
  profileRowToCreatorSummary,
  unknownCreatorSummary,
  PROFILE_SELECT_CREATOR_WITH_FRAME,
} from '@/services/supabase/profileRowMapper';

function rowToNotification(row: any): NotificationItem {
  const actor: CreatorSummary = row.actor_profile
    ? profileRowToCreatorSummary(row.actor_profile)
    : unknownCreatorSummary(row.actor_id ?? '');

  return {
    id: row.id,
    type: row.type,
    actor,
    message: row.message,
    createdAt: row.created_at,
    read: row.read,
    targetId: row.target_id,
    communityId: row.community_id ?? null,
  };
}

function notificationPassesLocalMute(n: NotificationItem, muted: Set<string>): boolean {
  if (!n.communityId) return true;
  return !muted.has(n.communityId);
}

export const notificationService = {
  async getAll(): Promise<NotificationItem[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select(`*, actor_profile:actor_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    const muted = await getMutedCommunityIds();
    return data.map(rowToNotification).filter((n) => notificationPassesLocalMute(n, muted));
  },

  async getUnreadCount(): Promise<number> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const muted = await getMutedCommunityIds();
      let q = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (muted.size > 0) {
        const list = [...muted].join(',');
        q = q.or(`community_id.is.null,community_id.not.in.(${list})`);
      }

      const { count, error } = await q;

      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllAsRead(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  },
};
