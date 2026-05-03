import { supabase } from '@/lib/supabase';

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl: string;
    role: string;
    isVerified: boolean;
  };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export const messagesService = {
  /** True if either user has blocked the other (requires RLS allowing both to read the row — see migration 100). */
  async usersAreBlockedPair(userId: string, otherUserId: string): Promise<boolean> {
    if (!userId?.trim() || !otherUserId?.trim() || userId === otherUserId) return false;
    const { data: rows } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    return (rows ?? []).some(
      (r: { blocker_id: string; blocked_id: string }) =>
        (r.blocker_id === userId && r.blocked_id === otherUserId) ||
        (r.blocker_id === otherUserId && r.blocked_id === userId),
    );
  },

  async assertMessagingAllowed(userId: string, otherUserId: string): Promise<void> {
    if (await this.usersAreBlockedPair(userId, otherUserId)) {
      throw new Error('Messaging isn’t available with this account right now.');
    }
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, last_message_at, created_at,
        p1:participant_1(id, display_name, avatar_url, role, is_verified),
        p2:participant_2(id, display_name, avatar_url, role, is_verified)
      `)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    const conversations: Conversation[] = [];
    for (const row of data ?? []) {
      const other = (row.p1 as any).id === userId ? row.p2 : row.p1;
      const otherUser = other as any;

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', row.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', row.id)
        .eq('read', false)
        .neq('sender_id', userId);

      conversations.push({
        id: row.id,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.display_name,
          avatarUrl: otherUser.avatar_url ?? '',
          role: otherUser.role,
          isVerified: otherUser.is_verified,
        },
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: row.last_message_at,
        unreadCount: count ?? 0,
      });
    }

    return conversations;
  },

  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      read: m.read,
      createdAt: m.created_at,
    }));
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      content: data.content,
      read: data.read,
      createdAt: data.created_at,
    };
  },

  async getOrCreateConversation(userId: string, otherUserId: string): Promise<string> {
    await this.assertMessagingAllowed(userId, otherUserId);
    const [p1, p2] = [userId, otherUserId].sort();

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .single();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async markAsRead(conversationId: string, userId: string) {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);
  },

  /**
   * Remove the thread for both participants. Messages are removed via ON DELETE CASCADE.
   * RLS: migration 104 — delete allowed when auth user is a participant.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) throw error;
  },

  /**
   * Block someone from messaging you (symmetric: neither can message while blocked).
   * Optionally delete the existing thread so history does not reappear after unblock.
   */
  async blockUserAndOptionalDeleteConversation(
    blockerId: string,
    blockedUserId: string,
    opts?: { conversationId?: string | null },
  ): Promise<void> {
    if (blockerId === blockedUserId) return;
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedUserId)
      .maybeSingle();
    if (!existing) {
      const { error: blockErr } = await supabase.from('blocked_users').insert({
        blocker_id: blockerId,
        blocked_id: blockedUserId,
      } as never);
      if (blockErr) throw blockErr;
    }
    if (opts?.conversationId) {
      try {
        await this.deleteConversation(opts.conversationId);
      } catch {
        /* Conversation may already be hidden by RLS; block is the source of truth. */
      }
    }
  },
};
