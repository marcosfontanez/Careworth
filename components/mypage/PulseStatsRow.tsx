import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@/theme';
import { formatPulseStat } from '@/utils/pulseScore';
import { hasSeenPulseTooltip, markPulseTooltipSeen } from '@/lib/pulseTooltipSeen';
import { PulseHistorySheet } from './PulseHistorySheet';
import { PulseScorePill } from './PulseScorePill';
import { usePulseScorePillModel } from '@/hooks/usePulseScorePillModel';

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

  const { overall, tier } = usePulseScorePillModel(userId, initialScore, initialTier);

  const handleOpenHistory = () => {
    Haptics.selectionAsync().catch(() => undefined);
    dismissTooltip();
    setHistoryOpen(true);
  };

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
          <PulseScorePill
            style={styles.cell}
            value={String(overall)}
            tierLabel={tier.label}
            tierAccent={tier.accent}
            tierGlow={tier.glow}
            onPress={handleOpenHistory}
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
