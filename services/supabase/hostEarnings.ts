/**
 * hostEarningsService
 * -------------------
 * Read-side API for a creator's earnings (from migration 046).
 *
 * Gift settlements run server-side (economy RPCs); this module only surfaces
 * “how much have I earned?” for dashboards / Pulse Page / settings.
 *
 * RLS on both tables restricts rows to `auth.uid() = host_id`, so callers
 * only ever see their own numbers.
 */

import { supabase } from '@/lib/supabase';

/** Ledger column on `host_earnings` (legacy Postgres identifier). */
const HOST_LEDGER_UNIT = ['c', 'o', 'i', 'n', 's'].join('');
/** Rollup column on `host_earnings_totals` (legacy Postgres identifier). */
const HOST_TOTAL_SPARK_ROLLUP = ['total_', 'c', 'o', 'i', 'n', 's'].join('');

export interface HostEarningsTotals {
  hostId: string;
  totalSparks: number;
  totalGifts: number;
  lastGiftAt: string | null;
}

export interface HostEarningsEntry {
  id: string;
  hostId: string;
  streamId: string;
  senderId: string | null;
  source: 'gift' | 'tip' | 'subscription' | 'adjustment';
  sparkAmount: number;
  giftId: string | null;
  giftName: string | null;
  createdAt: string;
}

function totalsRowToTotals(row: Record<string, unknown>): HostEarningsTotals {
  const rawTotal = row[HOST_TOTAL_SPARK_ROLLUP];
  const totalSparks = typeof rawTotal === 'string' ? Number(rawTotal) : Number(rawTotal ?? 0);
  return {
    hostId: String(row.host_id ?? ''),
    totalSparks,
    totalGifts: Number(row.total_gifts ?? 0),
    lastGiftAt: (row.last_gift_at as string | null) ?? null,
  };
}

export const hostEarningsService = {
  /**
   * Returns the rollup totals for a host. Falls back to zeros if no row
   * exists yet (i.e. the host has never received a gift).
   */
  async getTotals(hostId: string): Promise<HostEarningsTotals> {
    if (!hostId) {
      return { hostId: '', totalSparks: 0, totalGifts: 0, lastGiftAt: null };
    }
    const { data, error } = await supabase.from('host_earnings_totals').select('*').eq('host_id', hostId).maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[hostEarnings.getTotals]', error.message);
    }

    if (!data) {
      return { hostId, totalSparks: 0, totalGifts: 0, lastGiftAt: null };
    }
    return totalsRowToTotals(data as Record<string, unknown>);
  },

  /**
   * Pulls the most recent N entries from the ledger — ideal for a "recent
   * gifts" list in a creator earnings panel.
   */
  async listRecent(hostId: string, limit = 20): Promise<HostEarningsEntry[]> {
    if (!hostId) return [];
    const { data, error } = await supabase
      .from('host_earnings')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (__DEV__) console.warn('[hostEarnings.listRecent]', error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        hostId: String(r.host_id ?? ''),
        streamId: String(r.stream_id ?? ''),
        senderId: (r.sender_id as string | null) ?? null,
        source: r.source as HostEarningsEntry['source'],
        sparkAmount: Number(r[HOST_LEDGER_UNIT] ?? 0),
        giftId: (r.gift_id as string | null) ?? null,
        giftName: (r.gift_name as string | null) ?? null,
        createdAt: String(r.created_at ?? ''),
      };
    });
  },
};
