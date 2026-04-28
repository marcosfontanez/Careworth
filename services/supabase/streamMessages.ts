import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StreamMessage } from '@/types';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';

/**
 * Shape written into the DB. Matches the migration's column list 1:1 so the
 * row -> domain transform is trivial.
 */
interface StreamMessageRow {
  id: string;
  stream_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  content: string;
  message_type: 'chat' | 'system' | 'gift' | 'pinned';
  is_host: boolean;
  is_moderator: boolean;
  is_subscriber: boolean;
  deleted_at: string | null;
  created_at: string;
}

function rowToMessage(row: StreamMessageRow): StreamMessage {
  return {
    id: row.id,
    streamId: row.stream_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    role: (row.role as any) ?? undefined,
    content: row.content,
    isHost: row.is_host,
    isModerator: row.is_moderator,
    isSubscriber: row.is_subscriber,
    createdAt: row.created_at,
    messageType: row.message_type,
  };
}

export interface SendStreamMessageInput {
  streamId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role?: string;
  content: string;
  isHost?: boolean;
  isModerator?: boolean;
}

export const streamMessagesService = {
  /**
   * Load the most recent N messages for a stream, oldest-first so the chat
   * column can render them in natural order. Defaults to the last 50.
   */
  async listRecent(streamId: string, limit = 50): Promise<StreamMessage[]> {
    if (!streamId) return [];
    const { data, error } = await supabase
      .from('stream_messages')
      .select('*')
      .eq('stream_id', streamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 200)));

    if (error) {
      if (__DEV__) console.warn('[streamMessages.listRecent]', error.message);
      return [];
    }

    return (data ?? []).map((r) => rowToMessage(r as StreamMessageRow)).reverse();
  },

  /**
   * Insert a chat message. Content is defensively trimmed + length-capped so
   * clients that sidestep the UI still hit the server CHECK predictably.
   */
  async send(input: SendStreamMessageInput): Promise<StreamMessage | null> {
    const trimmed = input.content.trim().slice(0, STREAM_CHAT_MAX_LENGTH);
    if (!trimmed) return null;

    const payload = {
      stream_id: input.streamId,
      user_id: input.userId,
      display_name: input.displayName,
      avatar_url: input.avatarUrl ?? null,
      role: input.role ?? null,
      content: trimmed,
      message_type: 'chat' as const,
      is_host: !!input.isHost,
      is_moderator: !!input.isModerator,
      is_subscriber: false,
    };

    const { data, error } = await supabase
      .from('stream_messages')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamMessages.send]', error.message);
      return null;
    }
    return rowToMessage(data as StreamMessageRow);
  },

  /** Soft-delete by the author or the stream host. */
  async softDelete(messageId: string): Promise<boolean> {
    if (!messageId) return false;
    const { error } = await supabase
      .from('stream_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) {
      if (__DEV__) console.warn('[streamMessages.softDelete]', error.message);
      return false;
    }
    return true;
  },

  /**
   * Subscribe to new inserts on a stream's chat. Returns an unsubscribe fn.
   * Caller is responsible for invoking it in an effect cleanup.
   */
  subscribe(streamId: string, onMessage: (m: StreamMessage) => void): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`stream_messages:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const row = payload.new as StreamMessageRow;
          if (row.deleted_at) return;
          onMessage(rowToMessage(row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
