import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '@/theme';
import { pulseScoresService } from '@/services/supabase';
import {
  almostThereAction,
  clampScore,
  formatPulseStat,
  nextTierProgress,
  PULSE_SCORE_EXPLAINER,
  PULSE_SUBSCORES,
  PULSE_TIERS,
  PulseMonthRecord,
  PulseScoreSnapshot,
  PulseSubScoreKey,
  PulseSubScores,
  tierForScore,
  tierMeta,
  weakestSubScore,
} from '@/utils/pulseScore';

/**
 * Android's `LayoutAnimation` requires an opt-in. Enabling it once at
 * module scope is the documented pattern — safe to call multiple times.
 */
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  visible: boolean;
  userId: string | null;
  /** Display name for the header subtitle ("Maya's Pulse History"). */
  displayName?: string;
  /** If the viewer isn't the profile owner we hide coaching / lifetime cards. */
  isOwner?: boolean;
  /**
   * When true, show a prominent "Share your new tier" card at the top
   * of the sheet. Set by the tier-up notification deep-link so the
   * celebratory moment has a one-tap share affordance. Requires
   * `isOwner` — the share message is written in the first person.
   */
  highlightShareTier?: boolean;
  onClose: () => void;
}

/**
 * Full-screen-ish sheet shown when the user taps their Pulse Score pill.
 *
 * Stacked sections, top → bottom:
 *   1. Current-month hero — overall score, tier chip, 5 sub-score bars,
 *      coaching nudge on the weakest axis.
 *   2. Lifetime card — total points, best month, months active, anthem
 *      count.
 *   3. Monthly history — every finalized month with its tier badge, so
 *      the user can see their long-term arc.
 *
 * Owns its own data fetch (via `get_pulse_history` + `get_current_pulse_score`).
 * Cheap to render because neither RPC scans more than one user's rows.
 */
export function PulseHistorySheet({
  visible,
  userId,
  displayName,
  isOwner = true,
  highlightShareTier = false,
  onClose,
}: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pulseHistory', userId],
    queryFn: () => pulseScoresService.getHistory(userId),
    enabled: visible && !!userId,
    staleTime: 60_000,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="pulse" size={18} color={colors.primary.teal} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Pulse History</Text>
              <Text style={styles.headerSubtitle}>
                {displayName ? `${displayName}'s growth on PulseVerse` : 'Your growth on PulseVerse'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : isError || !data ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No Pulse yet</Text>
              <Text style={styles.emptyBody}>
                Share something on PulseVerse to start building your Pulse Score.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {highlightShareTier && isOwner && userId ? (
                <ShareTierCard
                  userId={userId}
                  displayName={displayName ?? 'you'}
                  tier={data.current.tier}
                  score={data.current.overall}
                />
              ) : null}

              <CurrentMonthCard
                score={data.current}
                streakDays={data.current.streakDays}
                isOwner={isOwner}
              />

              <LifetimeCard
                lifetimeTotal={data.lifetime.lifetimeTotal}
                bestMonthScore={data.lifetime.bestMonthScore}
                bestTier={data.lifetime.bestTier}
                monthsActive={data.lifetime.monthsActive}
                anthemMonths={data.lifetime.anthemMonths}
              />

              <MonthlyHistoryList
                months={data.months}
                current={data.current}
              />

              <View style={styles.footerExplainer}>
                <Text style={styles.footerExplainerText}>
                  {PULSE_SCORE_EXPLAINER}
                </Text>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// Current-month hero card
// ────────────────────────────────────────────────────────────────────

function CurrentMonthCard({
  score,
  streakDays,
  isOwner,
}: {
  score: PulseSubScores & { overall: number; monthStart: string };
  streakDays: number;
  isOwner: boolean;
}) {
  const tier = tierForScore(score.overall);
  const weakest = weakestSubScore(score);
  const monthLabel = useMemo(() => formatMonthLabel(score.monthStart), [score.monthStart]);

  /**
   * Progress toward the next tier. `isAlmostThere` flips true when the
   * user is within 10 points of the next band — that's when we swap
   * the generic tip for the high-contrast "Almost there" banner so
   * the moment feels earned.
   */
  const progress = useMemo(() => nextTierProgress(score.overall), [score.overall]);

  /**
   * Within the first ~48 hours of a new month, most axes haven't had
   * time to accumulate enough signal to look meaningful (Reach carries
   * over from followers, but Resonance/Rhythm/Range/Reciprocity reset).
   * Swap the nudge for a gentler "forming" banner so users don't read
   * the drop as a demotion.
   */
  const isEarlyMonth = useMemo(() => {
    const now = new Date();
    if (now.getUTCDate() > 2) return false;
    return true;
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardKicker}>This month · {monthLabel}</Text>
        {streakDays > 1 ? (
          <View style={styles.streakChip}>
            <Ionicons name="flame" size={10} color="#F59E0B" />
            <Text style={styles.streakChipText}>{streakDays}-day streak</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.heroRow}>
        <LinearGradient
          colors={[tier.accent, tier.glow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroRing}
        >
          <View style={styles.heroInner}>
            <Text style={styles.heroValue}>{score.overall}</Text>
            <Text style={styles.heroLabel}>/ 100</Text>
          </View>
        </LinearGradient>

        <View style={styles.heroMetaCol}>
          <View
            style={[
              styles.tierChip,
              { backgroundColor: `${tier.accent}20`, borderColor: `${tier.accent}66` },
            ]}
          >
            <Text style={[styles.tierChipText, { color: tier.accent }]}>
              {tier.label.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.tierBlurb}>{tier.blurb}</Text>
        </View>
      </View>

      <View style={styles.barsBlock}>
        {PULSE_SUBSCORES.map((sub) => {
          const val = clampScore(score[sub.key as keyof PulseSubScores]);
          return (
            <SubScoreBar
              key={sub.key}
              label={sub.label}
              value={val}
              isWeakest={sub.key === weakest.key}
            />
          );
        })}
      </View>

      {isOwner ? (
        progress.isAlmostThere ? (
          <AlmostThereNudge
            pointsToNext={progress.pointsToNext}
            nextTierLabel={progress.next!.label}
            nextTierAccent={progress.next!.accent}
            nextTierGlow={progress.next!.glow}
            actionLine={almostThereAction(score)}
          />
        ) : isEarlyMonth ? (
          <View
            style={[
              styles.coachCard,
              {
                backgroundColor: 'rgba(34,197,94,0.08)',
                borderColor: 'rgba(34,197,94,0.28)',
              },
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={14}
              color="#22C55E"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.coachText}>
              <Text style={[styles.coachTextBold, { color: '#22C55E' }]}>
                Your {monthLabel.split(' ')[0]} Pulse is forming ·{' '}
              </Text>
              Early-month scores settle after a few days of activity — keep posting and it'll bloom.
            </Text>
          </View>
        ) : progress.isTopTier ? (
          <View
            style={[
              styles.coachCard,
              {
                backgroundColor: 'rgba(245,158,11,0.10)',
                borderColor: 'rgba(245,158,11,0.35)',
              },
            ]}
          >
            <Ionicons
              name="trophy"
              size={14}
              color="#F59E0B"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.coachText}>
              <Text style={[styles.coachTextBold, { color: '#F59E0B' }]}>
                You're at Anthem ·{' '}
              </Text>
              Keep the streak alive — staying here is the real flex.
            </Text>
          </View>
        ) : (
          <View style={styles.coachCard}>
            <Ionicons
              name="sparkles"
              size={14}
              color={colors.primary.teal}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.coachText}>
              <Text style={styles.coachTextBold}>Tip · </Text>
              {weakest.coachNudge}
            </Text>
          </View>
        )
      ) : null}
    </View>
  );
}

/**
 * Celebration card shown at the top of the history sheet when the user
 * just leveled up and is arriving via the tier-up notification
 * deep-link. Offers a one-tap share to boast about the new tier on
 * iMessage / Instagram / wherever — this is one of our strongest
 * growth loops because every share-through lands a non-installed
 * viewer on the user's profile, which auto-redirects to the install
 * CTA for anyone without the app.
 */
function ShareTierCard({
  userId,
  displayName,
  tier,
  score,
}: {
  userId: string;
  displayName: string;
  tier: string;
  score: number;
}) {
  const meta = tierMeta(tier);
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { shareTierUp } = await import('@/lib/share');
      await shareTierUp({
        userId,
        displayName,
        tierLabel: meta.label,
        score,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={[`${meta.accent}30`, `${meta.accent}10`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.shareTierCard,
        { borderColor: `${meta.accent}66`, shadowColor: meta.glow },
      ]}
    >
      <View style={styles.shareTierRow}>
        <View
          style={[
            styles.shareTierIcon,
            { backgroundColor: `${meta.accent}24`, borderColor: `${meta.accent}88` },
          ]}
        >
          <Ionicons name="trophy" size={18} color={meta.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareTierTitle}>
            You reached{' '}
            <Text style={{ color: meta.accent }}>{meta.label.toUpperCase()}</Text>
          </Text>
          <Text style={styles.shareTierBody}>
            Show it off — every share lands someone new on your profile.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onShare}
        disabled={busy}
        style={({ pressed }) => [
          styles.shareTierBtn,
          {
            backgroundColor: meta.accent,
            opacity: pressed || busy ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Share your ${meta.label} tier`}
      >
        <Ionicons name="share-social" size={15} color="#FFF" />
        <Text style={styles.shareTierBtnText}>Share my tier</Text>
      </Pressable>
    </LinearGradient>
  );
}

/**
 * High-contrast "Almost there" banner — the celebratory moment when the
 * user is within 10 pts of the next tier. Deliberately louder than the
 * default coach card: gradient stroke, next-tier glow, next-tier accent
 * on the points pill. This is the single line we most want the user to
 * see, so it's big and explicit about exactly how to close the gap.
 */
function AlmostThereNudge({
  pointsToNext,
  nextTierLabel,
  nextTierAccent,
  nextTierGlow,
  actionLine,
}: {
  pointsToNext: number;
  nextTierLabel: string;
  nextTierAccent: string;
  nextTierGlow: string;
  actionLine: string;
}) {
  return (
    <LinearGradient
      colors={[`${nextTierAccent}30`, `${nextTierAccent}10`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.almostThereCard,
        {
          borderColor: `${nextTierAccent}66`,
          shadowColor: nextTierGlow,
        },
      ]}
    >
      <View style={styles.almostThereHeader}>
        <View
          style={[
            styles.almostThereDeltaPill,
            { backgroundColor: `${nextTierAccent}24`, borderColor: `${nextTierAccent}88` },
          ]}
        >
          <Ionicons name="flash" size={11} color={nextTierAccent} />
          <Text style={[styles.almostThereDeltaText, { color: nextTierAccent }]}>
            {pointsToNext} PT{pointsToNext === 1 ? '' : 'S'} TO{' '}
            {nextTierLabel.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.almostThereTitle}>
        You're almost{' '}
        <Text style={{ color: nextTierAccent }}>{nextTierLabel}</Text>.
      </Text>
      <Text style={styles.almostThereBody}>{actionLine}</Text>
    </LinearGradient>
  );
}

function SubScoreBar({
  label,
  value,
  isWeakest,
}: {
  label: string;
  value: number;
  isWeakest: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, isWeakest && styles.barLabelWeakest]}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.barValue, isWeakest && styles.barLabelWeakest]}>
        {pct}
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Lifetime summary card
// ────────────────────────────────────────────────────────────────────

function LifetimeCard({
  lifetimeTotal,
  bestMonthScore,
  bestTier,
  monthsActive,
  anthemMonths,
}: {
  lifetimeTotal: number;
  bestMonthScore: number;
  bestTier: string;
  monthsActive: number;
  anthemMonths: number;
}) {
  const best = tierMeta(bestTier);
  return (
    <View style={styles.card}>
      <Text style={styles.cardKicker}>Lifetime</Text>
      <View style={styles.lifetimeRow}>
        <LifetimeStat
          label="Total"
          value={formatPulseStat(lifetimeTotal)}
          accent="#F59E0B"
        />
        <LifetimeStat
          label="Best month"
          value={String(bestMonthScore)}
          suffix={best.label}
          accent={best.accent}
        />
        <LifetimeStat
          label="Months active"
          value={String(monthsActive)}
          accent={colors.primary.teal}
        />
        <LifetimeStat
          label="Anthems"
          value={String(anthemMonths)}
          accent="#F59E0B"
        />
      </View>
    </View>
  );
}

function LifetimeStat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <View style={styles.lifetimeCell}>
      <Text style={[styles.lifetimeValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      {suffix ? (
        <Text style={styles.lifetimeSuffix} numberOfLines={1}>
          {suffix}
        </Text>
      ) : null}
      <Text style={styles.lifetimeLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Monthly history list
// ────────────────────────────────────────────────────────────────────

function MonthlyHistoryList({
  months,
  current,
}: {
  months: PulseMonthRecord[];
  current: PulseScoreSnapshot;
}) {
  /**
   * Drop the current (not-finalized) month — already shown in hero —
   * and show only the completed chapters. Most-recent first.
   */
  const finalized = useMemo(
    () => months.filter((m) => m.finalized),
    [months],
  );

  /**
   * Only one compare panel can be open at a time — keeps the sheet
   * short on small phones and makes the "tap to expand / tap again to
   * collapse" interaction legible.
   */
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const handleToggle = (monthStart: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonth((prev) => (prev === monthStart ? null : monthStart));
  };

  if (finalized.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardKicker}>Monthly history</Text>
        <View style={styles.historyEmptyWrap}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={colors.dark.textMuted}
          />
          <Text style={styles.historyEmptyText}>
            Your first month isn't finalized yet. Come back on the 1st to see it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardKicker}>Monthly history</Text>
        <Text style={styles.historyHint}>Tap to compare</Text>
      </View>
      <View style={styles.historyBlock}>
        {finalized.map((m) => {
          const isOpen = expandedMonth === m.monthStart;
          return (
            <MonthHistoryItem
              key={m.monthStart}
              month={m}
              current={current}
              isOpen={isOpen}
              onToggle={() => handleToggle(m.monthStart)}
            />
          );
        })}
      </View>

      <View style={styles.tierLadder}>
        {PULSE_TIERS.map((t) => (
          <View
            key={t.id}
            style={[styles.tierPip, { backgroundColor: t.accent }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Expandable month row with compare strip ──────────────────────────

function MonthHistoryItem({
  month,
  current,
  isOpen,
  onToggle,
}: {
  month: PulseMonthRecord;
  current: PulseScoreSnapshot;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = tierMeta(month.tier);
  const overallDelta = current.overall - month.overall;

  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={styles.historyRow}
        accessibilityRole="button"
        accessibilityLabel={`Compare ${formatMonthLabel(month.monthStart)} to this month`}
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={styles.historyMonthCol}>
          <Text style={styles.historyMonth}>
            {formatMonthLabel(month.monthStart)}
          </Text>
        </View>
        <View
          style={[
            styles.historyTierPill,
            {
              backgroundColor: `${t.accent}18`,
              borderColor: `${t.accent}55`,
            },
          ]}
        >
          <Text style={[styles.historyTierText, { color: t.accent }]}>
            {t.label}
          </Text>
        </View>
        <Text style={styles.historyScore}>{month.overall}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.dark.textMuted}
          style={styles.historyChevron}
        />
      </Pressable>

      {isOpen ? (
        <View style={styles.compareBlock}>
          {/* Headline: "This month vs April · +8" */}
          <View style={styles.compareHeadline}>
            <Text style={styles.compareHeadlineText}>
              This month vs {formatMonthLabel(month.monthStart).split(' ')[0]}
            </Text>
            <DeltaPill delta={overallDelta} bigger />
          </View>

          {/* Per-sub-score deltas, same order as the hero card */}
          <View style={styles.compareRows}>
            {PULSE_SUBSCORES.map((sub) => {
              const key = sub.key as PulseSubScoreKey;
              const pastVal = clampScore(month[key]);
              const currVal = clampScore(current[key]);
              return (
                <CompareRow
                  key={key}
                  label={sub.label}
                  past={pastVal}
                  curr={currVal}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CompareRow({
  label,
  past,
  curr,
}: {
  label: string;
  past: number;
  curr: number;
}) {
  const delta = curr - past;
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.compareNums}>
        <Text style={styles.compareNumPast}>{past}</Text>
        <Ionicons
          name="arrow-forward"
          size={10}
          color={colors.dark.textMuted}
          style={{ marginHorizontal: 4 }}
        />
        <Text style={styles.compareNumCurr}>{curr}</Text>
      </View>
      <DeltaPill delta={delta} />
    </View>
  );
}

function DeltaPill({ delta, bigger = false }: { delta: number; bigger?: boolean }) {
  /**
   * Colour coding:
   *   +gain  → emerald
   *   0      → slate (flat)
   *   loss   → soft rose (we don't red-flag a dip)
   */
  const isGain = delta > 0;
  const isFlat = delta === 0;
  const color = isFlat ? '#94A3B8' : isGain ? '#22C55E' : '#F472B6';
  const label = isFlat ? '±0' : `${isGain ? '+' : ''}${delta}`;
  return (
    <View
      style={[
        styles.deltaPill,
        bigger && styles.deltaPillBigger,
        { backgroundColor: `${color}1E`, borderColor: `${color}66` },
      ]}
    >
      <Text
        style={[
          styles.deltaPillText,
          bigger && styles.deltaPillTextBigger,
          { color },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function formatMonthLabel(monthStart: string | null | undefined): string {
  if (!monthStart) return '—';
  // `monthStart` is a YYYY-MM-DD string from Postgres. Avoid the timezone
  // gotcha of `new Date("2026-04-01")` (which is UTC midnight); format
  // from the raw parts to guarantee correct month naming in every locale.
  const [y, m] = monthStart.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 6,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.borderSubtle,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: { flex: 1 },
  headerTitle: {
    ...typography.h4,
    color: colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.dark.textMuted,
    marginTop: 2,
  },

  loadingWrap: { paddingVertical: 64, alignItems: 'center' },
  emptyWrap: { paddingVertical: 48, paddingHorizontal: spacing.xl, alignItems: 'center' },
  emptyTitle: {
    ...typography.h4,
    color: colors.dark.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13.5,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  scroll: { maxHeight: '100%' },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },

  // Cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroRing: {
    borderRadius: 999,
    padding: 2,
  },
  heroInner: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(5,11,20,0.94)',
    minWidth: 90,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: {
    fontSize: 13,
    color: colors.dark.textMuted,
    fontWeight: '700',
  },
  heroMetaCol: { flex: 1, gap: 4 },
  tierChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  tierBlurb: {
    fontSize: 12.5,
    color: colors.dark.textSecondary,
    fontWeight: '600',
  },

  // Streak chip
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.40)',
  },
  streakChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },

  // Bars
  barsBlock: { gap: 9 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 86,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
  barLabelWeakest: { color: '#F59E0B' },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary.teal,
    borderRadius: 3,
  },
  barValue: {
    width: 30,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },

  // Coach
  coachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.22)',
  },
  coachText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.dark.textSecondary,
  },
  coachTextBold: {
    color: colors.primary.teal,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Share-your-tier celebration card (tier-up deep-link only)
  shareTierCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.55 : 0,
    shadowRadius: 18,
    elevation: 5,
    marginBottom: spacing.md,
  },
  shareTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  shareTierIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareTierTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  shareTierBody: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.dark.textSecondary,
  },
  shareTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  shareTierBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Almost-there nudge (within 10 pts of next tier)
  almostThereCard: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.45 : 0,
    shadowRadius: 14,
    elevation: 4,
  },
  almostThereHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  almostThereDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  almostThereDeltaText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  almostThereTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  almostThereBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textSecondary,
  },

  // Lifetime
  lifetimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lifetimeCell: { flex: 1, alignItems: 'center' },
  lifetimeValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  lifetimeSuffix: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  lifetimeLabel: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // History
  historyBlock: { gap: 10 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyMonthCol: { flex: 1 },
  historyMonth: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.text,
  },
  historyTierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  historyTierText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  historyScore: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  historyEmptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  historyEmptyText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.dark.textMuted,
    lineHeight: 18,
  },
  historyHint: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  historyChevron: {
    marginLeft: 2,
  },

  // Compare strip
  compareBlock: {
    marginTop: 6,
    marginBottom: 4,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.20)',
    gap: 10,
  },
  compareHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareHeadlineText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.2,
  },
  compareRows: {
    gap: 6,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
  compareNums: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'center',
  },
  compareNumPast: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 22,
    textAlign: 'right',
  },
  compareNumCurr: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
    minWidth: 22,
  },
  deltaPill: {
    minWidth: 36,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  deltaPillBigger: {
    minWidth: 46,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  deltaPillText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  deltaPillTextBigger: {
    fontSize: 12,
  },

  // Tier ladder
  tierLadder: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tierPip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },

  footerExplainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  footerExplainerText: {
    fontSize: 11.5,
    color: colors.dark.textMuted,
    lineHeight: 17,
    textAlign: 'center',
  },
});
