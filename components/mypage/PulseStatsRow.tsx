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
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '@/theme';
import { formatPulseStat } from '@/utils/pulseScore';
import { hasSeenPulseTooltip, markPulseTooltipSeen } from '@/lib/pulseTooltipSeen';
import { PulseHistorySheet } from './PulseHistorySheet';
import { usePulseScorePillModel } from '@/hooks/usePulseScorePillModel';

interface PulseStatsRowProps {
  userId: string | null;
  displayName?: string;
  isOwner?: boolean;
  followers: number;
  following: number;
  initialScore?: number | null;
  initialTier?: string | null;
  initialHistoryOpen?: boolean;
  highlightShareTier?: boolean;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

/**
 * Three boxed stat cards: Followers, Following, Pulse Score (crown + number + label).
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
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOwner || !userId) return;
    let cancelled = false;
    void (async () => {
      const seen = await hasSeenPulseTooltip();
      if (cancelled || seen) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipVisible]);

  const { overall, tier } = usePulseScorePillModel(userId, initialScore, initialTier);
  const scoreDisplayed = Math.min(100, Math.round(Number(overall) || 0));

  const handleOpenHistory = () => {
    Haptics.selectionAsync().catch(() => undefined);
    dismissTooltip();
    setHistoryOpen(true);
  };

  return (
    <>
      <View style={styles.row}>
        <MiniStatCard
          icon="people"
          value={formatPulseStat(followers)}
          label="Followers"
          onPress={onPressFollowers}
        />
        <MiniStatCard
          icon="person-outline"
          value={formatPulseStat(following)}
          label="Following"
          onPress={onPressFollowing}
        />
        <View style={styles.pulseCellWrap}>
          <PulseScoreCard
            score={scoreDisplayed}
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

function MiniStatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const Body = (
    <View style={styles.miniCard}>
      <View style={styles.iconWell}>
        <Ionicons name={icon} size={18} color={colors.primary.teal} />
      </View>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.miniCardOuter}
        onPress={onPress}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        {Body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.miniCardOuter}>{Body}</View>;
}

function PulseScoreCard({
  score,
  tierAccent,
  tierGlow,
  onPress,
}: {
  score: number;
  tierAccent: string;
  tierGlow: string;
  onPress: () => void;
}) {
  const glow = useRef(new Animated.Value(0.45)).current;
  const crownShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseGlow = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.45,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseGlow.start();
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(crownShake, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(crownShake, { toValue: -1, duration: 260, useNativeDriver: true }),
        Animated.timing(crownShake, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(400),
      ]),
    );
    wobble.start();
    return () => {
      pulseGlow.stop();
      wobble.stop();
    };
  }, [glow, crownShake]);

  const rotate = crownShake.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-7deg', '7deg'],
  });

  return (
    <Pressable
      style={[styles.pulseCardOuter, { borderColor: `${tierAccent}88`, shadowColor: tierAccent }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View Pulse Score history"
    >
      <LinearGradient
        colors={['rgba(8,14,24,0.96)', 'rgba(12,22,38,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseCardHalo,
          {
            backgroundColor: tierGlow,
            opacity: glow.interpolate({
              inputRange: [0.45, 1],
              outputRange: [0.25, 0.6],
            }),
          },
        ]}
      />
      <View style={styles.pulseCardInner}>
        <Animated.View style={[styles.crownRow, { transform: [{ rotate }] }]}>
          <Text style={styles.crownEmoji}>👑</Text>
          <View style={[styles.pulseTick, { borderColor: tierAccent }]}>
            <Ionicons name="pulse" size={10} color={tierAccent} />
          </View>
        </Animated.View>
        <Text style={styles.pulseScoreNum} numberOfLines={1}>
          {score}
        </Text>
        <Text style={[styles.pulseLabel, { color: tierAccent }]} numberOfLines={1}>
          Pulse Score
        </Text>
      </View>
    </Pressable>
  );
}

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
          <Text style={styles.tooltipBody}>Tap to see the five signals behind it.</Text>
        </View>
        <Ionicons name="close" size={14} color={colors.dark.textMuted} />
      </Pressable>
      <View style={[styles.tooltipArrow, { borderTopColor: colors.dark.cardAlt }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: spacing.sm,
  },
  miniCardOuter: {
    flex: 1,
    minWidth: 0,
  },
  miniCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(13,21,36,0.92)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 118,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,184,166,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  miniLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  pulseCellWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  pulseCardOuter: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 118,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  pulseCardHalo: {
    ...StyleSheet.absoluteFillObject,
  },
  pulseCardInner: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownRow: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  crownEmoji: {
    fontSize: 26,
    textShadowColor: colors.primary.teal,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  pulseTick: {
    marginLeft: -4,
    marginBottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(6,14,26,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseScoreNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  pulseLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  tooltipAnchor: {
    position: 'absolute',
    bottom: '100%',
    alignItems: 'center',
    width: 210,
    marginBottom: 8,
    alignSelf: 'center',
    left: -40,
    right: -40,
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
