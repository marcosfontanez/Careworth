/**
 * hostEarningsService
 * -------------------
 * Read-side API for a creator's earnings (from migration 046).
 *
 * Writes happen exclusively through the `transfer_gift_coins` RPC (see
 * streamGifts.ts) — this file is purely for surfacing "how much have I
 * earned?" inside creator dashboards / Pulse Page / settings.
 *
 * RLS on both tables restricts rows to `auth.uid() = host_id`, so callers
 * only ever see their own numbers.
 */

import { supabase } from '@/lib/supabase';

export interface HostEarningsTotals {
  hostId: string;
  totalCoins: number;
  totalGifts: number;
  lastGiftAt: string | null;
}

export interface HostEarningsEntry {
  id: string;
  hostId: string;
  streamId: string;
  senderId: string | null;
  source: 'gift' | 'tip' | 'subscription' | 'adjustment';
  coins: number;
  giftId: string | null;
  giftName: string | null;
  createdAt: string;
}

function totalsRowToTotals(row: {
  host_id: string;
  total_coins: number | string;
  total_gifts: number;
  last_gift_at: string | null;
}): HostEarningsTotals {
  return {
    hostId: row.host_id,
    // `total_coins` is bigint → may come back as string over the wire.
    totalCoins: typeof row.total_coins === 'string' ? Number(row.total_coins) : row.total_coins,
    totalGifts: row.total_gifts,
    lastGiftAt: row.last_gift_at,
  };
}

export const hostEarningsService = {
  /**
   * Returns the rollup totals for a host. Falls back to zeros if no row
   * exists yet (i.e. the host has never received a gift).
   */
  async getTotals(hostId: string): Promise<HostEarningsTotals> {
    if (!hostId) {
      return { hostId: '', totalCoins: 0, totalGifts: 0, lastGiftAt: null };
    }
    const { data, error } = await supabase
      .from('host_earnings_totals')
      .select('host_id,total_coins,total_gifts,last_gift_at')
      .eq('host_id', hostId)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[hostEarnings.getTotals]', error.message);
    }

    if (!data) {
      return { hostId, totalCoins: 0, totalGifts: 0, lastGiftAt: null };
    }
    return totalsRowToTotals(data);
  },

  /**
   * Pulls the most recent N entries from the ledger — ideal for a "recent
   * gifts" list in a creator earnings panel.
   */
  async listRecent(hostId: string, limit = 20): Promise<HostEarningsEntry[]> {
    if (!hostId) return [];
    const { data, error } = await supabase
      .from('host_earnings')
      .select('id,host_id,stream_id,sender_id,source,coins,gift_id,gift_name,created_at')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (__DEV__) console.warn('[hostEarnings.listRecent]', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      hostId: row.host_id,
      streamId: row.stream_id,
      senderId: row.sender_id,
      source: row.source,
      coins: row.coins,
      giftId: row.gift_id,
      giftName: row.gift_name,
      createdAt: row.created_at,
    }));
  },
};
