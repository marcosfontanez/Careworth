import type { NotificationItem, CreatorSummary } from '@/types';
import { supabase } from '@/lib/supabase';
import { getMutedCommunityIds } from '@/lib/circleExperience';
import {
  finalizeNotificationsForViewer,
  anonymousNotificationActor,
} from '@/lib/notificationPrivacy';
import {
  profileRowToCreatorSummary,
  unknownCreatorSummary,
  PROFILE_SELECT_CREATOR_WITH_FRAME,
} from '@/services/supabase/profileRowMapper';

function rowToNotification(row: any): NotificationItem {
  const actor: CreatorSummary = row.actor_profile
    ? profileRowToCreatorSummary(row.actor_profile)
    : row.actor_id
      ? unknownCreatorSummary(row.actor_id)
      : anonymousNotificationActor();

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

async function resolveViewerId(explicit?: string | null): Promise<string | null> {
  const t = explicit?.trim();
  if (t) return t;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function resolveConfessionsCommunityId(): Promise<string | null> {
  const { data } = await supabase.from('communities').select('id').eq('slug', 'confessions').maybeSingle();
  return data?.id ?? null;
}

export const notificationService = {
  /**
   * Pass `viewerId` from `useAuth().user.id` to skip an extra `getUser()` round-trip.
   */
  async getAll(viewerId?: string | null): Promise<NotificationItem[]> {
    const [uid, muted, confessionsCommunityId] = await Promise.all([
      resolveViewerId(viewerId),
      getMutedCommunityIds(),
      resolveConfessionsCommunityId(),
    ]);
    if (!uid) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select(
        `id, type, actor_id, message, created_at, read, target_id, community_id, actor_profile:actor_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})`,
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return finalizeNotificationsForViewer(data.map(rowToNotification), {
      confessionsCommunityId,
      viewerId: uid,
    }).filter((n) => notificationPassesLocalMute(n, muted));
  },

  async getUnreadCount(viewerId?: string | null): Promise<number> {
    try {
      const [uid, muted] = await Promise.all([resolveViewerId(viewerId), getMutedCommunityIds()]);
      if (!uid) return 0;

      let q = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
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
