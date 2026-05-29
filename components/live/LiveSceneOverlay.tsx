import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LiveBrbOverlay } from '@/components/live/LiveBrbOverlay';
import { LiveScenePollPrompt } from '@/components/live/LiveScenePollPrompt';
import { colors, borderRadius, typography } from '@/theme';
import { liveSceneLabel, sceneIsFullOverlay, type LiveSceneMode } from '@/lib/live/liveSceneMode';

type Props = {
  mode: LiveSceneMode;
  compact?: boolean;
  onResume?: () => void;
  pollQuestion?: string | null;
};

function SceneCard({
  icon,
  title,
  subtitle,
  accent,
  pulse = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: 'teal' | 'purple' | 'gold' | 'pink';
  pulse?: boolean;
}) {
  const ring = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, ring]);

  const accentColor =
    accent === 'purple'
      ? '#C4B5FD'
      : accent === 'gold'
        ? colors.primary.gold
        : accent === 'pink'
          ? '#F9A8D4'
          : colors.primary.teal;

  return (
    <View style={styles.cardWrap}>
      <LinearGradient colors={['#060E1A', '#0C1628', '#101E38']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(56,189,248,0.12)', 'transparent', 'rgba(236,72,153,0.1)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cardContent}>
        <View style={[styles.iconRingOuter, { borderColor: `${accentColor}44` }]}>
          {pulse ? (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: ring,
                  borderColor: accentColor,
                  transform: [
                    {
                      scale: ring.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.92, 1.12],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          <View style={[styles.iconRing, { borderColor: `${accentColor}55` }]}>
            <Ionicons name={icon} size={32} color={accentColor} />
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.brand}>PulseVerse Live</Text>
      </View>
    </View>
  );
}

function SceneModeBadge({ mode }: { mode: LiveSceneMode }) {
  return (
    <View style={styles.badgeWrap} pointerEvents="none">
      <View style={styles.badge}>
        <Ionicons name="layers-outline" size={14} color={colors.primary.teal} />
        <Text style={styles.badgeTxt}>{liveSceneLabel(mode)}</Text>
      </View>
    </View>
  );
}

/** Branded scene overlays synced from host `scene_mode`. */
export function LiveSceneOverlay({ mode, compact, onResume, pollQuestion }: Props) {
  if (mode === 'live') return null;

  if (mode === 'brb') {
    return (
      <View style={[styles.fill, compact && styles.fillCompact]}>
        <LiveBrbOverlay compact={compact} onResume={onResume} showResume={Boolean(onResume)} />
      </View>
    );
  }

  if (sceneIsFullOverlay(mode)) {
    if (mode === 'starting_soon') {
      return (
        <SceneCard
          icon="time-outline"
          title="Starting Soon"
          subtitle="The host is getting ready — stay tuned."
          accent="teal"
          pulse
        />
      );
    }
    if (mode === 'ending_soon') {
      return (
        <SceneCard
          icon="flag-outline"
          title="Wrapping Up"
          subtitle="This session is ending soon. Thanks for watching."
          accent="gold"
        />
      );
    }
  }

  if (mode === 'qna') {
    return <SceneModeBadge mode="qna" />;
  }

  if (mode === 'poll') {
    if (pollQuestion?.trim()) {
      return <LiveScenePollPrompt question={pollQuestion} compact={compact} />;
    }
    return <SceneModeBadge mode="poll" />;
  }

  return null;
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, zIndex: 6 },
  fillCompact: { position: 'relative', flex: 1 },
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    zIndex: 6,
  },
  cardContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  iconRingOuter: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderRadius: 48,
    borderWidth: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
  },
  title: {
    ...typography.h1,
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  subtitle: {
    ...typography.bodySmall,
    color: 'rgba(248,250,252,0.68)',
    textAlign: 'center',
    lineHeight: 20,
  },
  brand: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  badgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  badgeTxt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: '#E9D5FF',
  },
});
