import type { NotificationItem, CreatorSummary } from '@/types';
import { supabase } from '@/lib/supabase';

function rowToNotification(row: any): NotificationItem {
  const actor: CreatorSummary = row.actor_profile
    ? {
        id: row.actor_profile.id,
        displayName: row.actor_profile.display_name,
        avatarUrl: row.actor_profile.avatar_url ?? '',
        role: row.actor_profile.role,
        specialty: row.actor_profile.specialty,
        city: row.actor_profile.city,
        state: row.actor_profile.state,
        isVerified: row.actor_profile.is_verified,
      }
    : {
        id: row.actor_id ?? '',
        displayName: 'Unknown',
        avatarUrl: '',
        role: 'RN',
        specialty: 'General',
        city: '',
        state: '',
        isVerified: false,
      };

  return {
    id: row.id,
    type: row.type,
    actor,
    message: row.message,
    createdAt: row.created_at,
    read: row.read,
    targetId: row.target_id,
  };
}

export const notificationService = {
  async getAll(): Promise<NotificationItem[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor_profile:actor_id(id, display_name, avatar_url, role, specialty, city, state, is_verified)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data.map(rowToNotification);
  },

  async getUnreadCount(): Promise<number> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

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
