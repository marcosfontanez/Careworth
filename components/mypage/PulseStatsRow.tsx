import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@/theme';
import { pulseScoresService } from '@/services/supabase';
import {
  PULSE_TIERS,
  formatPulseStat,
  tierForScore,
  type PulseTier,
} from '@/utils/pulseScore';
import { hasSeenPulseTooltip, markPulseTooltipSeen } from '@/lib/pulseTooltipSeen';
import { PulseHistorySheet } from './PulseHistorySheet';

interface PulseStatsRowProps {
  /** Profile owner id — score is always the owner's, never the viewer's. */
  userId: string | null;
  /** Owner's display name for the history sheet header. */
  displayName?: string;
  /** True when the viewer is looking at their own Pulse page. */
  isOwner?: boolean;

  followers: number;
  following: number;

  /**
   * Denormalized current-month score read directly off the profile row
   * (populated by migration 059's sync trigger). Used as an instant
   * first-paint value and as a safety net whenever the live RPC read is
   * unavailable — loading, offline, erroring, or the RPC grant hasn't
   * propagated yet. Live RPC still runs in the background to pick up
   * engagement that happened since the last trigger fire.
   */
  initialScore?: number | null;
  initialTier?: string | null;

  /**
   * Auto-open the history sheet on mount. Used by the tier-up
   * notification deep-link (`/profile/:id?openPulseHistory=1`) so the
   * celebratory moment is one tap, not three.
   */
  initialHistoryOpen?: boolean;

  /**
   * When true, the auto-opened history sheet will show a prominent
   * "Share my tier" card at the top. Fired only by the tier-up
   * notification deep-link (`...&tierUp=1`) so the celebration feels
   * earned — tapping the pill normally just opens the regular sheet.
   */
  highlightShareTier?: boolean;

  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

/**
 * Three-column stats strip on the Pulse Page:
 * Followers · Following · Pulse Score.
 *
 * The Pulse Score cell is live-fetched from the Pulse Score v2 engine
 * (migration 058) and shows the current month's overall 0–100 score with
 * a tier chip underneath. Tapping it opens `PulseHistorySheet` — the
 * tap-through identity surface with month-by-month breakdown, lifetime
 * totals, and a coaching nudge.
 */
export function PulseStatsRow({
  userId,
  displayName,
  isOwner = true,
  followers,
  following,
  initialScore,
  initialTier,
  initialHistoryOpen = false,
  highlightShareTier = false,
  onPressFollowers,
  onPressFollowing,
}: PulseStatsRowProps) {
  const [historyOpen, setHistoryOpen] = useState(initialHistoryOpen);
  /**
   * First-time tooltip pointing at the pill. Only shown to the profile
   * owner (other people's pills don't need explaining to them) and only
   * once ever — dismissal is persisted via AsyncStorage. Tooltip auto-
   * dismisses after 7s or on any interaction (tapping the pill, or
   * tapping the bubble itself).
   */
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOwner || !userId) return;
    let cancelled = false;
    (async () => {
      const seen = await hasSeenPulseTooltip();
      if (cancelled || seen) return;
      // Small delay so the stat strip finishes laying out before the
      // tooltip floats in — prevents a jarring flash during route push.
      setTimeout(() => {
        if (cancelled) return;
        setTooltipVisible(true);
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }).start();
      }, 650);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, userId, tooltipOpacity]);

  const dismissTooltip = () => {
    if (!tooltipVisible) return;
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setTooltipVisible(false));
    void markPulseTooltipSeen();
  };

  useEffect(() => {
    if (!tooltipVisible) return;
    const t = setTimeout(dismissTooltip, 7000);
    return () => clearTimeout(t);
    // `dismissTooltip` is stable enough for this — it only touches the
    // animated value and the boolean.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipVisible]);

  /**
   * Live fetch. We keep staleTime tight so the number reconciles within
   * a minute of any engagement the user makes — the RPC is cheap (single
   * user, indexed joins) and it also upserts the active-month row so
   * leaderboards update for free on every read.
   *
   * `placeholderData` seeds the query with the denormalized profile
   * columns so the very first render shows the correct score instead
   * of a `0` flicker while the RPC is in flight. This means the
   * snapshot is *never* null in practice — the fallback chain below
   * is only exercised if the denorm itself is missing (brand-new
   * accounts) or the RPC is broken AND the profile prop is null.
   *
   * `isError` is still surfaced so the pill can keep falling back to
   * the denorm if the RPC grant hasn't propagated yet or the RPC
   * itself errors (the migration 058 STABLE bug, the 060 column-
   * shadow bug, etc — past lessons we should never re-learn).
   */
  const {
    data: snapshot,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ['pulseScoreCurrent', userId],
    queryFn: () => pulseScoresService.getCurrent(userId),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
    placeholderData:
      Number.isFinite(initialScore) && initialScore != null
        ? {
            reach: 0,
            resonance: 0,
            rhythm: 0,
            range: 0,
            reciprocity: 0,
            overall: Number(initialScore),
            tier: (normaliseTier(initialTier) ?? tierForScore(Number(initialScore)).id) as PulseTier,
            monthStart: '',
            streakDays: 0,
          }
        : undefined,
  });

  const handleOpenHistory = () => {
    Haptics.selectionAsync().catch(() => undefined);
    dismissTooltip();
    setHistoryOpen(true);
  };

  /**
   * Resolution order for the number shown in the pill:
   *   1. Live RPC snapshot (authoritative, recomputes on every read).
   *   2. Denormalized `profile.pulse_score_current` passed in as
   *      `initialScore` — kept in sync by migration 059's trigger.
   *   3. Last non-zero value we've ever seen this session (sticky).
   *   4. 0 (brand-new account with no activity yet).
   *
   * Because (2) is also wired into the query as `placeholderData`, the
   * pill never flashes "0" on a user who already has a score, even
   * while (1) is in-flight. (3) guards against transient races where
   * the RPC errors and `initialScore` is briefly null on a route push
   * — once we've shown a real number we never silently regress to 0
   * mid-session. The trade-off is tiny: a brand-new month reset will
   * start at 0 on first read of the next month, then the sticky ref
   * tracks correctly from there. We accept that — flickering the
   * owner's own score back to 0 is a much worse experience than a
   * one-frame stale value at month boundary.
   */
  const rpcOverall = snapshot?.overall;
  const fallbackOverall = Number.isFinite(initialScore) ? Number(initialScore) : 0;
  const useFallback =
    rpcOverall == null || (isError && !snapshot) || (isLoading && !snapshot);
  const resolvedOverall = useFallback ? fallbackOverall : (rpcOverall ?? 0);

  // Sticky last-known-good. Initialised to whatever non-zero value we
  // already have on first render so the very first paint isn't gated
  // on a re-render.
  const lastNonZeroRef = useRef<number>(resolvedOverall > 0 ? resolvedOverall : 0);
  if (resolvedOverall > 0 && resolvedOverall !== lastNonZeroRef.current) {
    lastNonZeroRef.current = resolvedOverall;
  }
  const overall = resolvedOverall > 0 ? resolvedOverall : lastNonZeroRef.current;

  /**
   * Tier resolution mirrors the score fallback chain — prefer the live
   * RPC tier when we have it, otherwise honour whatever tier label the
   * profile row carries, otherwise derive from the resolved score.
   */
  const rpcTier: PulseTier | undefined = snapshot?.tier;
  const initialTierSafe = normaliseTier(initialTier);
  const tier =
    (rpcTier && PULSE_TIERS[rpcTier]) ||
    (initialTierSafe && PULSE_TIERS[initialTierSafe]) ||
    tierForScore(overall);

  return (
    <>
      <View style={styles.row}>
        <StatCell
          value={formatPulseStat(followers)}
          label="Followers"
          onPress={onPressFollowers}
        />
        <View style={styles.divider} />
        <StatCell
          value={formatPulseStat(following)}
          label="Following"
          onPress={onPressFollowing}
        />
        <View style={styles.divider} />
        <View style={styles.pulseCellWrap}>
          <PulseScoreCell
            value={String(overall)}
            tierLabel={tier.label}
            tierAccent={tier.accent}
            tierGlow={tier.glow}
            onOpen={handleOpenHistory}
          />
          {tooltipVisible ? (
            <PulseFirstTimeTooltip
              opacity={tooltipOpacity}
              accent={tier.accent}
              onDismiss={dismissTooltip}
            />
          ) : null}
        </View>
      </View>

      <PulseHistorySheet
        visible={historyOpen}
        userId={userId}
        displayName={displayName}
        isOwner={isOwner}
        highlightShareTier={highlightShareTier && initialHistoryOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}

/**
 * First-time floating tooltip that points at the Pulse Score pill.
 * Appears once per user ever (persistence in AsyncStorage) and
 * auto-dismisses after 7s or on any pill interaction. Copy is
 * deliberately short — the history sheet is the real explainer, the
 * tooltip just teaches the affordance ("this thing is tappable").
 */
function PulseFirstTimeTooltip({
  opacity,
  accent,
  onDismiss,
}: {
  opacity: Animated.Value;
  accent: string;
  onDismiss: () => void;
}) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.tooltipAnchor,
        {
          opacity,
          transform: [
            {
              translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-4, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.tooltipBubble,
          { borderColor: `${accent}66`, shadowColor: accent },
        ]}
      >
        <View style={styles.tooltipIconCircle}>
          <Ionicons name="pulse" size={11} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tooltipTitle}>This is your Pulse</Text>
          <Text style={styles.tooltipBody}>
            Tap to see the five signals behind it.
          </Text>
        </View>
        <Ionicons name="close" size={14} color={colors.dark.textMuted} />
      </Pressable>
      {/** Downward-pointing arrow anchoring the bubble to the pill. */}
      <View style={[styles.tooltipArrow, { borderTopColor: colors.dark.cardAlt }]} />
    </Animated.View>
  );
}

/**
 * Normalise a raw `pulse_tier` string from the profiles table into the
 * `PulseTier` union. Defensive against older profiles or typos — if we
 * don't recognise the value we return undefined and let the caller
 * derive a tier from the score.
 */
function normaliseTier(raw: string | null | undefined): PulseTier | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'murmur' || v === 'pulse' || v === 'rhythm' || v === 'beat' || v === 'anthem') {
    return v;
  }
  return undefined;
}

function StatCell({
  value,
  label,
  onPress,
}: {
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={styles.cell}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Container>
  );
}

/**
 * The hero cell on this strip. Wraps the score digit in a gradient-lined
 * pill with a soft breathing glow; a small tier chip sits below the
 * score so "Pulse Score" reads as an identity artifact, not just a
 * number. The whole cell is a single tap target that opens the history
 * sheet — the info-button idiom is gone because the sheet itself IS the
 * explainer.
 */
function PulseScoreCell({
  value,
  tierLabel,
  tierAccent,
  tierGlow,
  onOpen,
}: {
  value: string;
  tierLabel: string;
  tierAccent: string;
  tierGlow: string;
  onOpen: () => void;
}) {
  const glow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.55,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [glow]);

  return (
    <Pressable
      style={styles.cell}
      onPress={onOpen}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="View Pulse Score history"
    >
      <View style={styles.scoreWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scoreHalo,
            {
              backgroundColor: tierGlow,
              opacity: glow.interpolate({
                inputRange: [0.55, 1],
                outputRange: [0.35, 0.75],
              }),
              transform: [
                {
                  scale: glow.interpolate({
                    inputRange: [0.55, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
            },
          ]}
        />
        <LinearGradient
          colors={[tierAccent, '#22D3EE', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreRing}
        >
          <View style={styles.scoreInner}>
            <Text style={styles.scoreValue} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View
        style={[
          styles.tierChipOuter,
          { backgroundColor: `${tierAccent}1E`, borderColor: `${tierAccent}66` },
        ]}
      >
        <Text style={[styles.tierChipText, { color: tierAccent }]} numberOfLines={1}>
          {tierLabel.toUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={9} color={tierAccent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.dark.borderSubtle,
    marginHorizontal: spacing.xs,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.4,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Pulse Score pill
  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 999,
  },
  scoreRing: {
    borderRadius: 999,
    padding: 1.5,
  },
  scoreInner: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(5,11,20,0.94)',
    minWidth: 62,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(20,184,166,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontVariant: ['tabular-nums'],
  },

  tierChipOuter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // First-time tooltip
  pulseCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipAnchor: {
    position: 'absolute',
    bottom: '100%',
    alignItems: 'center',
    width: 210,
    marginBottom: 8,
  },
  tooltipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.dark.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20,184,166,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  tooltipBody: {
    fontSize: 11.5,
    color: colors.dark.textSecondary,
    marginTop: 1,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
