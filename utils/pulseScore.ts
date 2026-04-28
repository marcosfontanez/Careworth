/**
 * Pulse Score v2 — PulseVerse's signature "health" metric.
 *
 * Five 0–100 sub-scores, averaged into a single 0–100 overall score that
 * maps to a named tier (Murmur → Pulse → Rhythm → Beat → Anthem). The
 * score resets monthly on the 1st at 00:00 UTC so virality from a single
 * post can't permanently dominate, and a Lifetime leaderboard tracks the
 * running sum of finalized monthly scores — longevity wins.
 *
 * All scoring math lives in Postgres (see migration
 * 058_pulse_score_v2.sql → `compute_pulse_subscores`). This file is the
 * **tier taxonomy + formatting helpers** the UI needs, plus a thin
 * service wrapper for reading scores via the RPCs. Keep tier ranges in
 * lock-step with `pulse_tier_from_score()` in the migration.
 */

// ────────────────────────────────────────────────────────────────────
// Tier taxonomy (single source of truth; mirrors SQL)
// ────────────────────────────────────────────────────────────────────

export type PulseTier = 'murmur' | 'pulse' | 'rhythm' | 'beat' | 'anthem';

export type PulseSubScoreKey =
  | 'reach'
  | 'resonance'
  | 'rhythm'
  | 'range'
  | 'reciprocity';

export interface PulseTierMeta {
  id: PulseTier;
  label: string; // Display form ("Murmur")
  blurb: string; // One-line identity descriptor
  min: number; // Inclusive lower bound
  max: number; // Inclusive upper bound
  accent: string; // Color accent for chips + rings
  glow: string; // Softer variant for halos
}

/**
 * Order matters — UI ladders iterate this array to render the tier
 * progression bar. Keep lowest → highest. Colors match the broader
 * PulseVerse palette (teal → violet → gold ladder).
 */
export const PULSE_TIERS: readonly PulseTierMeta[] = [
  {
    id: 'murmur',
    label: 'Murmur',
    blurb: 'You just arrived',
    min: 0,
    max: 19,
    accent: '#64748B',
    glow: 'rgba(100,116,139,0.30)',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    blurb: "You're being noticed",
    min: 20,
    max: 39,
    accent: '#14B8A6',
    glow: 'rgba(20,184,166,0.32)',
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    blurb: "You're a real presence",
    min: 40,
    max: 59,
    accent: '#22D3EE',
    glow: 'rgba(34,211,238,0.32)',
  },
  {
    id: 'beat',
    label: 'Beat',
    blurb: "You're a force",
    min: 60,
    max: 79,
    accent: '#A855F7',
    glow: 'rgba(168,85,247,0.32)',
  },
  {
    id: 'anthem',
    label: 'Anthem',
    blurb: 'Top-tier creator',
    min: 80,
    max: 100,
    accent: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
  },
] as const;

/**
 * Clamp-and-map an overall score to its tier. Returns `murmur` for any
 * out-of-range / NaN input so callers never crash on bad data.
 */
export function tierForScore(overall: number | null | undefined): PulseTierMeta {
  const n = typeof overall === 'number' && Number.isFinite(overall)
    ? Math.max(0, Math.min(100, Math.round(overall)))
    : 0;
  return PULSE_TIERS.find((t) => n >= t.min && n <= t.max) ?? PULSE_TIERS[0];
}

/** Lookup by tier id — handy when the server hands us a string tier. */
export function tierMeta(id: PulseTier | string | null | undefined): PulseTierMeta {
  return PULSE_TIERS.find((t) => t.id === id) ?? PULSE_TIERS[0];
}

// ────────────────────────────────────────────────────────────────────
// Sub-score descriptors (used by the history sheet + coaching nudges)
// ────────────────────────────────────────────────────────────────────

export interface PulseSubScoreMeta {
  key: PulseSubScoreKey;
  label: string;
  description: string;
  /** Coaching nudge shown when this is the user's weakest axis. */
  coachNudge: string;
}

/**
 * Canonical sub-score metadata. Order matters — the history sheet
 * renders bars in this order for readability (Reach first because it's
 * the most identity-defining axis; Reciprocity last because it's
 * community-oriented).
 */
export const PULSE_SUBSCORES: readonly PulseSubScoreMeta[] = [
  {
    key: 'reach',
    label: 'Reach',
    description: 'How many people follow you on PulseVerse.',
    coachNudge:
      'Your Reach is low — share your profile with friends and post something worth following.',
  },
  {
    key: 'resonance',
    label: 'Resonance',
    description: 'How much engagement your posts earn on average.',
    coachNudge:
      'Your Resonance is low — focus on one strong post this week instead of many small ones.',
  },
  {
    key: 'rhythm',
    label: 'Rhythm',
    description: 'Your posting consistency and daily activity streak.',
    coachNudge:
      'Your Rhythm is low — open the app and post something small today to start a streak.',
  },
  {
    key: 'range',
    label: 'Range',
    description: 'How many content types you used this month.',
    coachNudge:
      'Your Range is low — try a Thought, Clip, Link, or Pic to widen what you share.',
  },
  {
    key: 'reciprocity',
    label: 'Reciprocity',
    description: 'How much you show up for other creators.',
    coachNudge:
      'Your Reciprocity is low — leave a comment or share something you loved this week.',
  },
] as const;

// ────────────────────────────────────────────────────────────────────
// Snapshot types — mirror the Postgres RPC returns
// ────────────────────────────────────────────────────────────────────

export interface PulseSubScores {
  reach: number;
  resonance: number;
  rhythm: number;
  range: number;
  reciprocity: number;
}

export interface PulseScoreSnapshot extends PulseSubScores {
  overall: number;
  tier: PulseTier;
  monthStart: string; // ISO date (YYYY-MM-DD)
  streakDays: number;
}

export interface PulseMonthRecord extends PulseSubScores {
  overall: number;
  tier: PulseTier;
  monthStart: string;
  finalized: boolean;
}

export interface PulseLifetimeSummary {
  lifetimeTotal: number;
  bestMonthScore: number;
  bestTier: PulseTier;
  monthsActive: number;
  anthemMonths: number;
}

export interface PulseHistoryPayload {
  current: PulseScoreSnapshot;
  months: PulseMonthRecord[];
  lifetime: PulseLifetimeSummary;
}

export interface PulseLeaderboardRow {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  overall: number;
  tier: PulseTier;
}

export interface PulseLifetimeLeaderboardRow {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lifetimeTotal: number;
  bestMonthScore: number;
  bestTier: PulseTier;
  monthsActive: number;
  anthemMonths: number;
}

// ────────────────────────────────────────────────────────────────────
// Formatters
// ────────────────────────────────────────────────────────────────────

/**
 * Compact integer formatter for raw counts (lifetime totals, follower
 * counts on the leaderboard row). 1234 → "1.2K", 1250000 → "1.2M".
 */
export function formatPulseStat(n: number | null | undefined): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  if (v <= 0) return '0';
  if (v < 1_000) return String(Math.round(v));
  if (v < 10_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (v < 1_000_000) return `${Math.round(v / 1_000)}K`;
  if (v < 10_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${Math.round(v / 1_000_000)}M`;
}

/** Round a 0–100 sub-score for display; guards against NaN / negatives. */
export function clampScore(n: number | null | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Identify the user's weakest sub-score so the history sheet can show a
 * targeted coaching nudge. Ties → prefer axes that are cheapest to
 * improve (Rhythm before Reach, etc.) so the nudge feels actionable.
 */
export function weakestSubScore(
  scores: PulseSubScores,
): PulseSubScoreMeta {
  const priority: PulseSubScoreKey[] = [
    'rhythm',
    'range',
    'reciprocity',
    'resonance',
    'reach',
  ];
  let worst: PulseSubScoreKey = priority[0];
  let worstVal = scores[priority[0]] ?? 100;
  for (const key of priority) {
    const v = scores[key] ?? 100;
    if (v < worstVal) {
      worstVal = v;
      worst = key;
    }
  }
  return PULSE_SUBSCORES.find((s) => s.key === worst) ?? PULSE_SUBSCORES[0];
}

/**
 * One-line explainer for the info sheet. Deliberately concise — the real
 * teaching happens on the coaching nudge and sub-score bars.
 */
export const PULSE_SCORE_EXPLAINER =
  'Your Pulse Score blends five health axes: Reach, Resonance, Rhythm, Range, and Reciprocity. It resets on the 1st of every month, and your lifetime total carries forever.';

// ────────────────────────────────────────────────────────────────────
// Tier-progress helper — "Almost there" nudge
// ────────────────────────────────────────────────────────────────────

export interface NextTierProgress {
  /** Tier the user is in right now. */
  current: PulseTierMeta;
  /** The next tier up, or null if already at Anthem. */
  next: PulseTierMeta | null;
  /**
   * Exact number of additional points needed to cross into the next
   * tier's band. Always 0 when already at Anthem.
   */
  pointsToNext: number;
  /**
   * 0–1 progress through the current tier's band. Useful for rendering
   * a "tier progress" hairline under the hero ring.
   */
  bandProgress: number;
  /**
   * True when the user is close enough to the next tier to warrant the
   * "Almost there" banner. Threshold is intentionally small (≤10 pts)
   * so the nudge stays rare and special. Never true at Anthem.
   */
  isAlmostThere: boolean;
  /**
   * True when the user IS Anthem — caller can flip the banner to a
   * celebratory "You're at the top — keep the streak alive" variant.
   */
  isTopTier: boolean;
}

/**
 * Compute how far the user is from the next Pulse tier, based on the
 * overall score. The returned `isAlmostThere` flag is what the history
 * sheet keys off to show the "Almost there" nudge.
 */
export function nextTierProgress(
  overall: number | null | undefined,
): NextTierProgress {
  const score = clampScore(overall);
  const current = tierForScore(score);
  const idx = PULSE_TIERS.findIndex((t) => t.id === current.id);
  const next = idx >= 0 && idx < PULSE_TIERS.length - 1 ? PULSE_TIERS[idx + 1] : null;

  const pointsToNext = next ? Math.max(0, next.min - score) : 0;
  const bandSpan = Math.max(1, current.max - current.min + 1);
  const bandProgress = Math.max(0, Math.min(1, (score - current.min) / bandSpan));
  const isTopTier = current.id === 'anthem';
  // 10-pt threshold feels right: at 12 pts it reads as "aspirational",
  // at 10 it reads as "one push away".
  const isAlmostThere = !!next && pointsToNext > 0 && pointsToNext <= 10;

  return {
    current,
    next,
    pointsToNext,
    bandProgress,
    isAlmostThere,
    isTopTier,
  };
}

/**
 * Heuristic for the "Almost there" banner's actionable line. Given the
 * user's current sub-scores, return the shortest, most tier-moving
 * suggestion. Falls back to the weakest-axis coach nudge when no
 * sub-score has obvious headroom.
 */
export function almostThereAction(scores: PulseSubScores): string {
  const weakest = weakestSubScore(scores);

  // If Rhythm is the weakest AND under 50, recommending a single post
  // is very likely to move the needle (Rhythm is monthly-activity-based).
  // Otherwise defer to whichever axis has the most headroom via the
  // existing coach copy so the tone stays consistent with the rest of
  // the sheet.
  if (weakest.key === 'rhythm' && (scores.rhythm ?? 0) < 50) {
    return 'One post today will push you over the line — even a quick Thought counts.';
  }
  if (weakest.key === 'range' && (scores.range ?? 0) < 50) {
    return 'Try a content type you haven\'t used this month — Thought, Clip, Link, or Pic.';
  }
  if (weakest.key === 'reciprocity' && (scores.reciprocity ?? 0) < 50) {
    return 'Drop a comment or share something you loved — Reciprocity is fastest to move.';
  }
  return weakest.coachNudge;
}
