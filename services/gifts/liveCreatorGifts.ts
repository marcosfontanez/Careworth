import { supabase } from '@/lib/supabase';
import type { CreatorLiveGiftEvent } from '@/lib/gifts/types';
import type { StreamGiftLeaderboard } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type GiftItemMeta = { slug: string; name: string };

async function loadGiftItemMeta(ids: string[]): Promise<Map<string, GiftItemMeta>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('shop_items')
    .select('id, slug, name')
    .in('id', ids);
  if (error) {
    if (__DEV__) console.warn('[liveCreatorGifts.loadGiftItemMeta]', error.message);
    return new Map();
  }
  return new Map(
    (data ?? []).map((row) => [
      String(row.id),
      { slug: String(row.slug ?? 'pulse'), name: String(row.name ?? 'Gift') },
    ]),
  );
}

async function loadSenderNames(ids: string[]): Promise<Map<string, { displayName: string; avatarUrl?: string }>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);
  if (error) {
    if (__DEV__) console.warn('[liveCreatorGifts.loadSenderNames]', error.message);
    return new Map();
  }
  return new Map(
    (data ?? []).map((p) => [
      String(p.id),
      {
        displayName: String(p.display_name ?? 'Viewer'),
        avatarUrl: p.avatar_url ?? undefined,
      },
    ]),
  );
}

function rowToEvent(
  row: Record<string, unknown>,
  giftMeta: Map<string, GiftItemMeta>,
  senders: Map<string, { displayName: string; avatarUrl?: string }>,
): CreatorLiveGiftEvent | null {
  const id = String(row.id ?? '');
  const streamId = String(row.context_id ?? '');
  const senderId = String(row.sender_user_id ?? '');
  const giftItemId = String(row.gift_item_id ?? '');
  if (!id || !streamId || !senderId || !giftItemId) return null;
  if (String(row.context_type ?? '') !== 'live') return null;

  const meta = giftMeta.get(giftItemId);
  const sender = senders.get(senderId);

  return {
    id,
    streamId,
    senderId,
    senderName: sender?.displayName ?? 'Viewer',
    senderAvatar: sender?.avatarUrl,
    giftItemId,
    giftSlug: meta?.slug ?? 'pulse',
    giftName: meta?.name ?? 'Gift',
    sparksSpent: Math.max(0, Number(row.sparks_spent ?? 0) || 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export const liveCreatorGiftsService = {
  async fetchLeaderboard(streamId: string): Promise<StreamGiftLeaderboard[]> {
    if (!streamId) return [];

    const { data, error } = await (supabase as any)
      .from('creator_gifts')
      .select('sender_user_id, sparks_spent')
      .eq('context_type', 'live')
      .eq('context_id', streamId)
      .eq('status', 'posted');

    if (error) {
      if (__DEV__) console.warn('[liveCreatorGifts.fetchLeaderboard]', error.message);
      return [];
    }

    const rows = (data ?? []) as Array<{ sender_user_id: string; sparks_spent: number }>;
    if (rows.length === 0) return [];

    const senderIds = [...new Set(rows.map((r) => String(r.sender_user_id)))];
    const senders = await loadSenderNames(senderIds);

    const totals = new Map<string, StreamGiftLeaderboard>();
    for (const row of rows) {
      const userId = String(row.sender_user_id);
      const sparks = Math.max(0, Number(row.sparks_spent ?? 0) || 0);
      const profile = senders.get(userId);
      const existing = totals.get(userId);
      if (existing) {
        existing.totalSparks += sparks;
        existing.giftCount += 1;
      } else {
        totals.set(userId, {
          userId,
          displayName: profile?.displayName ?? 'Viewer',
          avatarUrl: profile?.avatarUrl,
          totalSparks: sparks,
          giftCount: 1,
          rank: 0,
        });
      }
    }

    return [...totals.values()]
      .sort((a, b) => b.totalSparks - a.totalSparks)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  },

  subscribe(streamId: string, onGift: (event: CreatorLiveGiftEvent) => void): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`creator_gifts:live:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'creator_gifts',
          filter: `context_id=eq.${streamId}`,
        },
        async (payload) => {
          try {
            const row = payload.new as Record<string, unknown>;
            if (String(row.context_type ?? '') !== 'live') return;
            if (String(row.status ?? '') !== 'posted') return;

            const giftItemId = String(row.gift_item_id ?? '');
            const senderId = String(row.sender_user_id ?? '');
            const [giftMeta, senders] = await Promise.all([
              loadGiftItemMeta(giftItemId ? [giftItemId] : []),
              loadSenderNames(senderId ? [senderId] : []),
            ]);

            const event = rowToEvent(row, giftMeta, senders);
            if (event) onGift(event);
          } catch (err) {
            if (__DEV__) console.warn('[liveCreatorGifts.subscribe]', err);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
