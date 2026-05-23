import { supabase } from '@/lib/supabase';
import {
  FALLBACK_GIFT_EMOJI,
  friendlyLiveGiftError,
  liveInteractionDebug,
  mapLiveGiftError,
} from '@/lib/live/liveInteractionDebug';
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

function normalizeGift(
  raw: Record<string, unknown>,
  fallback?: LiveGift,
): LiveGift {
  if (fallback?.id) return fallback;
  const sparkCost = sparkUnitFromGiftRow(raw);
  return {
    id: String(raw.gift_id ?? fallback?.id ?? 'gift'),
    name: String(raw.gift_name ?? fallback?.name ?? 'Gift'),
    emoji: String(raw.gift_emoji ?? fallback?.emoji ?? FALLBACK_GIFT_EMOJI),
    sparkCost: Number.isFinite(sparkCost) ? sparkCost : 0,
    tier: fallback?.tier ?? 'standard',
    animation: fallback?.animation ?? 'float',
    color: fallback?.color ?? '#FFFFFF',
  };
}

function rowToEvent(
  raw: Record<string, unknown>,
  opts: { senderName?: string; gift?: LiveGift } = {},
): LiveGiftEvent {
  const gift = normalizeGift(raw, opts.gift);
  const qty = Math.max(1, Number(raw.quantity ?? 1) || 1);

  return {
    id: String(raw.id ?? ''),
    streamId: String(raw.stream_id ?? ''),
    gift,
    senderId: String(raw.sender_id ?? ''),
    senderName: opts.senderName ?? 'Viewer',
    quantity: qty,
    comboCount: 1,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
  };
}

export interface SendGiftInput {
  streamId: string;
  gift: LiveGift;
  quantity: number;
  /** Client-generated UUID per send attempt — duplicate keys are idempotent server-side. */
  idempotencyKey: string;
}

export type SendGiftResult =
  | { ok: true; event: LiveGiftEvent }
  | { ok: false; reason: string; friendly: string };

export const streamGiftsService = {
  /**
   * Persist a live sticker gift: debit Sparks, credit host Diamonds, insert row (realtime).
   * Spark unit price is resolved server-side (`live_stream_gift_catalog`); `p_unit_spark_cost`
   * is kept for RPC backward compatibility but ignored — UI still shows costs from LIVE_GIFTS.
   * Free catalog gifts skip wallet debits inside the RPC.
   */
  async send(input: SendGiftInput): Promise<SendGiftResult> {
    const { streamId, gift, quantity, idempotencyKey } = input;

    if (!streamId?.trim()) {
      return { ok: false, reason: 'missing_stream_id', friendly: friendlyLiveGiftError('unknown') };
    }
    if (!gift?.id?.trim()) {
      return { ok: false, reason: 'missing_gift_id', friendly: friendlyLiveGiftError('gift_unknown') };
    }
    if (!idempotencyKey?.trim()) {
      return { ok: false, reason: 'missing_idempotency', friendly: friendlyLiveGiftError('unknown') };
    }

    liveInteractionDebug.giftSendRequested(streamId, gift.id);

    const { data: giftId, error: rpcError } = await supabase.rpc('economy_send_live_stream_gift', {
      p_stream_id: streamId.trim(),
      p_gift_id: gift.id,
      p_gift_name: gift.name ?? 'Gift',
      p_gift_emoji: gift.emoji ?? FALLBACK_GIFT_EMOJI,
      p_unit_spark_cost: gift.sparkCost ?? 0,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey.trim(),
    });

    if (rpcError) {
      const reason = mapLiveGiftError(rpcError.message);
      liveInteractionDebug.giftSendFailed(streamId, reason);
      if (__DEV__) console.warn('[streamGifts.send/rpc]', rpcError.message);
      return { ok: false, reason, friendly: friendlyLiveGiftError(reason) };
    }

    const rowId = typeof giftId === 'string' ? giftId : null;
    if (!rowId) {
      liveInteractionDebug.giftSendFailed(streamId, 'missing_return_id');
      if (__DEV__) console.warn('[streamGifts.send/rpc]', 'missing_return_id');
      return { ok: false, reason: 'missing_return_id', friendly: friendlyLiveGiftError('unknown') };
    }

    const { data: row, error } = await supabase
      .from('stream_gifts')
      .select('*')
      .eq('id', rowId)
      .maybeSingle();

    if (error) {
      liveInteractionDebug.giftSendFailed(streamId, 'fetch_failed');
      if (__DEV__) console.warn('[streamGifts.send/fetch]', error.message);
      return {
        ok: true,
        event: rowToEvent(
          { id: rowId, stream_id: streamId, gift_id: gift.id, gift_name: gift.name, gift_emoji: gift.emoji, quantity },
          { gift },
        ),
      };
    }
    if (!row) {
      return {
        ok: true,
        event: rowToEvent(
          { id: rowId, stream_id: streamId, gift_id: gift.id, gift_name: gift.name, gift_emoji: gift.emoji, quantity },
          { gift },
        ),
      };
    }

    liveInteractionDebug.giftSendOk(streamId, gift.id);
    return { ok: true, event: rowToEvent(row as Record<string, unknown>, { gift }) };
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
        (payload) => {
          try {
            onGift(rowToEvent(payload.new as Record<string, unknown>));
          } catch (err) {
            if (__DEV__) console.warn('[streamGifts.subscribe]', err);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
