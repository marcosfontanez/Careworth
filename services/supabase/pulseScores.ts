import { supabase } from '@/lib/supabase';
import type {
  PulseHistoryPayload,
  PulseLeaderboardRow,
  PulseLifetimeLeaderboardRow,
  PulseMonthRecord,
  PulseScoreSnapshot,
  PulseTier,
} from '@/utils/pulseScore';

/**
 * Thin RPC wrapper around migration 058's Pulse Score v2 engine.
 *
 * Every function here is a small adapter around a single SECURITY DEFINER
 * RPC — it validates inputs, executes the RPC, normalises row casing
 * (`range_` → `range`, `month_start` → `monthStart` etc.), and coerces the
 * `tier` string into the `PulseTier` union the client uses. Keeping the
 * adapter dumb (no caching, no mutation) lets React Query own the cache
 * semantics at the call-site.
 */

// ────────────────────────────────────────────────────────────────────
// Row → DTO mappers
// ────────────────────────────────────────────────────────────────────

function toTier(raw: unknown): PulseTier {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'murmur' || v === 'pulse' || v === 'rhythm' || v === 'beat' || v === 'anthem') {
    return v;
  }
  return 'murmur';
}

function rowToSnapshot(row: any): PulseScoreSnapshot {
  return {
    reach:       Number(row.reach)       || 0,
    resonance:   Number(row.resonance)   || 0,
    rhythm:      Number(row.rhythm)      || 0,
    range:       Number(row.range_)      || 0,
    reciprocity: Number(row.reciprocity) || 0,
    overall:     Number(row.overall)     || 0,
    tier:        toTier(row.tier),
    monthStart:  typeof row.month_start === 'string' ? row.month_start : '',
    streakDays:  Number(row.streak_days) || 0,
  };
}

function rowToMonthRecord(row: any): PulseMonthRecord {
  return {
    reach:       Number(row.reach)       || 0,
    resonance:   Number(row.resonance)   || 0,
    rhythm:      Number(row.rhythm)      || 0,
    range:       Number(row.range_)      || 0,
    reciprocity: Number(row.reciprocity) || 0,
    overall:     Number(row.overall)     || 0,
    tier:        toTier(row.tier),
    monthStart:  typeof row.month_start === 'string' ? row.month_start : '',
    finalized:   !!row.finalized,
  };
}

function rowToLeaderboard(row: any): PulseLeaderboardRow {
  return {
    userId:      String(row.user_id ?? ''),
    username:    row.username ?? null,
    displayName: row.display_name ?? null,
    avatarUrl:   row.avatar_url ?? null,
    overall:     Number(row.overall) || 0,
    tier:        toTier(row.tier),
  };
}

function rowToLifetimeLeaderboard(row: any): PulseLifetimeLeaderboardRow {
  return {
    userId:         String(row.user_id ?? ''),
    username:       row.username ?? null,
    displayName:    row.display_name ?? null,
    avatarUrl:      row.avatar_url ?? null,
    lifetimeTotal:  Number(row.lifetime_total) || 0,
    bestMonthScore: Number(row.best_month_score) || 0,
    bestTier:       toTier(row.best_tier),
    monthsActive:   Number(row.months_active) || 0,
    anthemMonths:   Number(row.anthem_months) || 0,
  };
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export const pulseScoresService = {
  /**
   * Live current-month score for a user. If `userId` is omitted the RPC
   * defaults to `auth.uid()` on the server.
   *
   * Side-effect: the underlying RPC also upserts the active-month row
   * in `user_monthly_pulse_scores` so leaderboard reads stay fresh
   * without a separate refresh job.
   */
  async getCurrent(userId?: string | null): Promise<PulseScoreSnapshot | null> {
    const { data, error } = await supabase
      .rpc('get_current_pulse_score', userId ? { p_user_id: userId } : {});
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? rowToSnapshot(row) : null;
  },

  /**
   * All finalized months + the in-progress current month + a lifetime
   * summary. Used by the "tap the pill" history sheet.
   */
  async getHistory(userId?: string | null): Promise<PulseHistoryPayload | null> {
    const { data, error } = await supabase
      .rpc('get_pulse_history', userId ? { p_user_id: userId } : {});
    if (error) throw error;
    const rows: any[] = Array.isArray(data) ? data : [];
    if (rows.length === 0) return null;

    const months = rows.map(rowToMonthRecord);

    /**
     * The RPC returns the lifetime summary columns repeated on every
     * row (so the single query can return both the month list and the
     * summary). Read from the first row — any row is fine.
     */
    const firstRaw = rows[0];
    const lifetime = {
      lifetimeTotal:  Number(firstRaw.lifetime_total) || 0,
      bestMonthScore: Number(firstRaw.best_month_score) || 0,
      bestTier:       toTier(firstRaw.best_tier),
      monthsActive:   Number(firstRaw.months_active) || 0,
      anthemMonths:   Number(firstRaw.anthem_months) || 0,
    };

    /**
     * The history RPC only returns the month list — it doesn't include
     * the streak. Fold the current snapshot in separately so callers
     * can show both in one sheet without a second round-trip. Falls
     * back to the first `finalized=false` month if the snapshot read
     * ever fails (rare; only when the current month has zero activity).
     */
    let current: PulseScoreSnapshot | null = null;
    try {
      current = await pulseScoresService.getCurrent(userId ?? null);
    } catch {
      current = null;
    }
    if (!current) {
      const fallback = months.find((m) => !m.finalized);
      if (fallback) {
        current = {
          reach:       fallback.reach,
          resonance:   fallback.resonance,
          rhythm:      fallback.rhythm,
          range:       fallback.range,
          reciprocity: fallback.reciprocity,
          overall:     fallback.overall,
          tier:        fallback.tier,
          monthStart:  fallback.monthStart,
          streakDays:  0,
        };
      }
    }

    if (!current) return null;

    return { current, months, lifetime };
  },

  /**
   * Top-N Pulse Scores for the current calendar month. Pass a circleId
   * to scope to a specific Community (null = global).
   */
  async getTopCurrent(
    limit: number = 5,
    circleId?: string | null,
  ): Promise<PulseLeaderboardRow[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
    const { data, error } = await supabase
      .rpc('get_top_current_pulse', {
        p_limit: safeLimit,
        p_circle_id: circleId ?? null,
      });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(rowToLeaderboard);
  },

  /**
   * Top-N lifetime leaderboard (sum of all finalized monthly scores).
   * Scope by Circle with `circleId`.
   */
  async getTopLifetime(
    limit: number = 5,
    circleId?: string | null,
  ): Promise<PulseLifetimeLeaderboardRow[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
    const { data, error } = await supabase
      .rpc('get_top_lifetime_pulse', {
        p_limit: safeLimit,
        p_circle_id: circleId ?? null,
      });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(rowToLifetimeLeaderboard);
  },
};
