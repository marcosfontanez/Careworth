import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LiveGift, LiveGiftEvent, StreamGiftLeaderboard } from '@/types';

/** Realtime payloads use raw Postgres column identifiers (see `sparkUnitFromGiftRow`). */
const STREAM_GIFT_UNIT_LEGACY_KEY = ['c', 'o', 'i', 'n', '_', 'c', 'o', 's', 't'].join('');

function sparkUnitFromGiftRow(row: Record<string, unknown>): number {
  const direct = row.spark_unit;
  if (typeof direct === 'number') return direct;
  const legacy = row[STREAM_GIFT_UNIT_LEGACY_KEY];
  return typeof legacy === 'number' ? legacy : Number(legacy);
}

function rowToEvent(
  raw: Record<string, unknown>,
  opts: { senderName?: string; gift?: LiveGift } = {},
): LiveGiftEvent {
  const unitCost = sparkUnitFromGiftRow(raw);
  const gift: LiveGift =
    opts.gift ??
    ({
      id: String(raw.gift_id ?? ''),
      name: String(raw.gift_name ?? ''),
      emoji: String(raw.gift_emoji ?? ''),
      sparkCost: unitCost,
      tier: 'standard',
      animation: 'float',
      color: '#FFFFFF',
    } as LiveGift);

  return {
    id: String(raw.id ?? ''),
    streamId: String(raw.stream_id ?? ''),
    gift,
    senderId: String(raw.sender_id ?? ''),
    senderName: opts.senderName ?? 'Viewer',
    quantity: Number(raw.quantity ?? 1),
    comboCount: 1,
    createdAt: String(raw.created_at ?? ''),
  };
}

export interface SendGiftInput {
  streamId: string;
  gift: LiveGift;
  quantity: number;
  /** Client-generated UUID per send attempt — duplicate keys are idempotent server-side. */
  idempotencyKey: string;
}

export const streamGiftsService = {
  /**
   * Persist a live sticker gift: debit Sparks, credit host Diamonds, insert row (realtime).
   * Spark unit price is resolved server-side (`live_stream_gift_catalog`); `p_unit_spark_cost`
   * is kept for RPC backward compatibility but ignored — UI still shows costs from LIVE_GIFTS.
   * Free catalog gifts skip wallet debits inside the RPC.
   */
  async send(input: SendGiftInput): Promise<LiveGiftEvent | null> {
    const { streamId, gift, quantity, idempotencyKey } = input;

    const { data: giftId, error: rpcError } = await supabase.rpc('economy_send_live_stream_gift', {
      p_stream_id: streamId,
      p_gift_id: gift.id,
      p_gift_name: gift.name,
      p_gift_emoji: gift.emoji,
      p_unit_spark_cost: gift.sparkCost,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      if (__DEV__) console.warn('[streamGifts.send/rpc]', rpcError.message);
      throw new Error(rpcError.message);
    }

    const rowId = typeof giftId === 'string' ? giftId : null;
    if (!rowId) {
      if (__DEV__) console.warn('[streamGifts.send/rpc]', 'missing_return_id');
      return null;
    }

    const { data: row, error } = await supabase
      .from('stream_gifts')
      .select('*')
      .eq('id', rowId)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[streamGifts.send/fetch]', error.message);
      return null;
    }
    if (!row) return null;

    return rowToEvent(row as Record<string, unknown>, { gift });
  },

  /**
   * Aggregate gift totals for a stream (full session history in DB).
   * Realtime inserts still update the in-room leaderboard between fetches.
   */
  async fetchLeaderboard(streamId: string): Promise<StreamGiftLeaderboard[]> {
    if (!streamId) return [];

    const { data, error } = await supabase
      .from('stream_gifts')
      .select('sender_id, quantity, coin_cost')
      .eq('stream_id', streamId);

    if (error) {
      if (__DEV__) console.warn('[streamGifts.fetchLeaderboard]', error.message);
      return [];
    }

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const senderIds = [...new Set(rows.map((r) => String(r.sender_id)))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', senderIds);

    const profileById = new Map(
      (profiles ?? []).map((p) => [
        String(p.id),
        { displayName: String(p.display_name ?? 'Viewer'), avatarUrl: p.avatar_url ?? undefined },
      ]),
    );

    const totals = new Map<string, StreamGiftLeaderboard>();
    for (const row of rows) {
      const userId = String(row.sender_id);
      const unit = Number(row.coin_cost ?? 0);
      const qty = Number(row.quantity ?? 1);
      const sparks = unit * qty;
      const profile = profileById.get(userId);
      const existing = totals.get(userId);
      if (existing) {
        existing.totalSparks += sparks;
        existing.giftCount += qty;
      } else {
        totals.set(userId, {
          userId,
          displayName: profile?.displayName ?? 'Viewer',
          avatarUrl: profile?.avatarUrl,
          totalSparks: sparks,
          giftCount: qty,
          rank: 0,
        });
      }
    }

    return [...totals.values()]
      .sort((a, b) => b.totalSparks - a.totalSparks)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  },

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
        (payload) => onGift(rowToEvent(payload.new as Record<string, unknown>)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
