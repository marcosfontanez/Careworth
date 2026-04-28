import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LiveGift, LiveGiftEvent } from '@/types';

interface StreamGiftRow {
  id: string;
  stream_id: string;
  sender_id: string;
  gift_id: string;
  gift_name: string;
  gift_emoji: string;
  coin_cost: number;
  quantity: number;
  created_at: string;
}

function rowToEvent(
  row: StreamGiftRow,
  opts: { senderName?: string; gift?: LiveGift } = {},
): LiveGiftEvent {
  const gift: LiveGift = opts.gift ?? {
    id: row.gift_id,
    name: row.gift_name,
    emoji: row.gift_emoji,
    coinCost: row.coin_cost,
    tier: 'standard',
    animation: 'float',
    color: '#FFFFFF',
  };

  return {
    id: row.id,
    streamId: row.stream_id,
    gift,
    senderId: row.sender_id,
    senderName: opts.senderName ?? 'Viewer',
    quantity: row.quantity,
    comboCount: 1,
    createdAt: row.created_at,
  };
}

export interface SendGiftInput {
  streamId: string;
  senderId: string;
  gift: LiveGift;
  quantity: number;
}

export const streamGiftsService = {
  /**
   * Persist a gift and debit the sender's coin balance atomically.
   *
   * Order of operations:
   *   1. If the gift has a coin cost, call `transfer_gift_coins` RPC — it
   *      debits the sender and throws if they're short. We trust the server.
   *   2. Insert into `stream_gifts`; the row will fan out via realtime.
   *
   * Free-tier gifts (cost = 0) skip the RPC entirely.
   */
  async send(input: SendGiftInput): Promise<LiveGiftEvent | null> {
    const { streamId, senderId, gift, quantity } = input;
    const totalCost = gift.coinCost * quantity;

    if (totalCost > 0) {
      const { error: txError } = await supabase.rpc('transfer_gift_coins', {
        sender_uid: senderId,
        stream_uid: streamId,
        amount: totalCost,
      });
      if (txError) {
        if (__DEV__) console.warn('[streamGifts.send/transfer]', txError.message);
        throw new Error(txError.message);
      }
    }

    const payload = {
      stream_id: streamId,
      sender_id: senderId,
      gift_id: gift.id,
      gift_name: gift.name,
      gift_emoji: gift.emoji,
      coin_cost: gift.coinCost,
      quantity,
    };

    const { data, error } = await supabase
      .from('stream_gifts')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamGifts.send/insert]', error.message);
      return null;
    }
    return rowToEvent(data as StreamGiftRow, { gift });
  },

  /**
   * Subscribe to gift inserts on a stream. We hand back the raw event and
   * the viewer room is responsible for hydrating sender identity (fast path:
   * just render as "Viewer", slow path: batch-fetch profiles later).
   */
  subscribe(streamId: string, onGift: (event: LiveGiftEvent) => void): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`stream_gifts:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_gifts',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => onGift(rowToEvent(payload.new as StreamGiftRow)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
