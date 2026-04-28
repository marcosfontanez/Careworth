import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StreamPinnedMessage } from '@/types';

interface StreamPinRow {
  id: string;
  stream_id: string;
  content: string;
  pinned_by: string;
  pinned_by_name: string;
  is_active: boolean;
  created_at: string;
}

function rowToPin(row: StreamPinRow): StreamPinnedMessage {
  return {
    id: row.id,
    streamId: row.stream_id,
    content: row.content,
    pinnedBy: row.pinned_by,
    pinnedByName: row.pinned_by_name,
    createdAt: row.created_at,
  };
}

export const streamPinsService = {
  /** Latest active pin on the given stream (if any). */
  async getActive(streamId: string): Promise<StreamPinnedMessage | null> {
    if (!streamId) return null;
    const { data, error } = await supabase
      .from('stream_pinned_messages')
      .select('*')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[streamPins.getActive]', error.message);
      return null;
    }
    if (!data) return null;
    return rowToPin(data as StreamPinRow);
  },

  /**
   * Pin a new message. Server RLS ensures only the stream host can do this.
   * Hosts calling this while another pin is active should first call `unpin`
   * on the previous one — the viewer room only renders one pin at a time.
   */
  async pin(input: {
    streamId: string;
    content: string;
    pinnedBy: string;
    pinnedByName: string;
  }): Promise<StreamPinnedMessage | null> {
    const { streamId, content, pinnedBy, pinnedByName } = input;
    if (!streamId || !content.trim() || !pinnedBy) return null;

    const { data, error } = await supabase
      .from('stream_pinned_messages')
      .insert({
        stream_id: streamId,
        content: content.trim(),
        pinned_by: pinnedBy,
        pinned_by_name: pinnedByName,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamPins.pin]', error.message);
      return null;
    }
    return rowToPin(data as StreamPinRow);
  },

  /** Host-only soft unpin. */
  async unpin(pinId: string): Promise<boolean> {
    if (!pinId) return false;
    const { error } = await supabase
      .from('stream_pinned_messages')
      .update({ is_active: false })
      .eq('id', pinId);
    if (error) {
      if (__DEV__) console.warn('[streamPins.unpin]', error.message);
      return false;
    }
    return true;
  },

  /**
   * Subscribe to pin changes: new pin INSERT or UPDATE (e.g. unpin). The
   * callback is handed the latest active pin, or `null` when unpinned.
   */
  subscribe(
    streamId: string,
    onChange: (pin: StreamPinnedMessage | null) => void,
  ): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`stream_pins:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_pinned_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as StreamPinRow | undefined;
          if (!row) return;
          if (!row.is_active) {
            onChange(null);
            return;
          }
          onChange(rowToPin(row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
