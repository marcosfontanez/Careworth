import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, StyleSheet, View, type AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type AnimatedBackgroundVariant = 'shopButton' | 'featuredHero' | 'fullPageSubtle';
export type AnimatedBackgroundIntensity = 'subtle' | 'medium' | 'bold';

const NAVY = ['#030712', '#0a1628', '#051018'] as const;

type Props = {
  variant: AnimatedBackgroundVariant;
  intensity?: AnimatedBackgroundIntensity;
  /** When false, freezes motion (e.g. inactive tab). */
  motionActive?: boolean;
  /** Respect iOS/Android reduce motion when true. */
  reducedMotionSupport?: boolean;
};

function intensityScale(i: AnimatedBackgroundIntensity): number {
  switch (i) {
    case 'subtle':
      return 0.72;
    case 'bold':
      return 1.18;
    default:
      return 1;
  }
}

/** Layered slow motion: waves, soft blobs, and faint sparks — stays behind UI (z-index 0). */
export function AnimatedBackground({
  variant,
  intensity = 'medium',
  motionActive = true,
  reducedMotionSupport = true,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let alive = true;
    if (reducedMotionSupport && Platform.OS !== 'web') {
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then((v) => {
          if (alive) setReduceMotion(Boolean(v));
        })
        .catch(() => {});
      const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
        setReduceMotion(Boolean(v));
      });
      return () => {
        alive = false;
        sub?.remove?.();
      };
    }
    return () => {
      alive = false;
    };
  }, [reducedMotionSupport]);

  const [appActive, setAppActive] = useState(appState.current === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appState.current = s;
      setAppActive(s === 'active');
    });
    return () => sub.remove();
  }, []);

  const scale = intensityScale(intensity) * (variant === 'featuredHero' ? 1.05 : variant === 'fullPageSubtle' ? 0.55 : 1);

  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  const w3 = useSharedValue(0);
  const pulse = useSharedValue(0);

  const shouldAnimate = motionActive && appActive && !(reducedMotionSupport && reduceMotion);

  const timing = useMemo(() => {
    if (variant === 'featuredHero') {
      return { d1: 24000, d2: 32000, d3: 19000, pulse: 4500 };
    }
    if (variant === 'fullPageSubtle') {
      return { d1: 36000, d2: 48000, d3: 28000, pulse: 8000 };
    }
    return { d1: 28000, d2: 38000, d3: 22000, pulse: 5200 };
  }, [variant]);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(w1);
      cancelAnimation(w2);
      cancelAnimation(w3);
      cancelAnimation(pulse);
      w1.value = 0;
      w2.value = 0;
      w3.value = 0;
      pulse.value = 0.5;
      return;
    }
    w1.value = withRepeat(
      withTiming(1, { duration: timing.d1, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    w2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: timing.d2 / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: timing.d2 / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    w3.value = withRepeat(
      withTiming(1, { duration: timing.d3, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: timing.pulse / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: timing.pulse / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [shouldAnimate, timing, w1, w2, w3, pulse]);

  const sm = Math.min(1, scale);

  const wave1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(w1.value, [0, 1], [-28 * sm, 28 * sm]) },
      { rotate: '-14deg' },
    ],
    opacity: interpolate(w1.value, [0, 1], [0.38 * sm, 0.62 * sm]),
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(w2.value, [0, 1], [22 * sm, -34 * sm]) },
      { rotate: '9deg' },
    ],
    opacity: interpolate(w2.value, [0, 1], [0.28 * sm, 0.5 * sm]),
  }));

  const wave3Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(w3.value, [0, 1], [-10 * sm, 14 * sm]) },
      { scale: interpolate(w3.value, [0, 1], [0.98, 1.04]) },
    ],
    opacity: 0.35 * sm,
  }));

  const arcStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.12 * sm, 0.28 * sm]),
    transform: [{ rotate: `${interpolate(pulse.value, [0, 1], [-6, 6])}deg` }],
  }));

  const sparkOpacities = useMemo(
    () => [0.12, 0.18, 0.14, 0.1, 0.16, 0.09].map((o) => o * scale * (variant === 'featuredHero' ? 1.15 : 1)),
    [scale, variant],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...NAVY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.waveWrap, { top: '8%', left: '-45%', width: '190%', height: 72 }, wave1Style]}>
        <LinearGradient
          colors={['transparent', 'rgba(34,211,238,0.14)', 'rgba(56,189,248,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.waveWrap, { top: '42%', left: '-38%', width: '170%', height: 96 }, wave2Style]}>
        <LinearGradient
          colors={['transparent', 'rgba(99,102,241,0.10)', 'rgba(56,189,248,0.07)', 'transparent']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.blob,
          {
            top: variant === 'featuredHero' ? '6%' : '12%',
            right: variant === 'featuredHero' ? '-16%' : '-20%',
            width: variant === 'featuredHero' ? 180 : 140,
            height: variant === 'featuredHero' ? 180 : 140,
          },
          wave3Style,
        ]}
      >
        <LinearGradient
          colors={['rgba(56,189,248,0.16)', 'rgba(15,23,42,0)', 'rgba(129,140,248,0.1)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.orbitArc, arcStyle]} />

      {SPARK_POINTS.map((p, i) => (
        <View
          key={i}
          style={[
            styles.spark,
            {
              top: p.t,
              left: p.l,
              opacity: sparkOpacities[i % sparkOpacities.length],
              width: p.s,
              height: p.s,
              borderRadius: p.s / 2,
              backgroundColor: p.c,
            },
          ]}
        />
      ))}
    </View>
  );
}

const SPARK_POINTS = [
  { t: '10%', l: '8%', s: 3, c: 'rgba(186,230,253,0.95)' },
  { t: '22%', l: '78%', s: 2.5, c: 'rgba(165,243,252,0.9)' },
  { t: '55%', l: '12%', s: 2, c: 'rgba(125,211,252,0.85)' },
  { t: '68%', l: '88%', s: 2.5, c: 'rgba(224,242,254,0.8)' },
  { t: '38%', l: '48%', s: 2, c: 'rgba(103,232,249,0.75)' },
  { t: '82%', l: '36%', s: 2, c: 'rgba(191,219,254,0.8)' },
] as const;

const styles = StyleSheet.create({
  waveWrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbitArc: {
    position: 'absolute',
    bottom: '-8%',
    left: '12%',
    width: '76%',
    height: 120,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.14)',
    borderRadius: 999,
    borderTopColor: 'rgba(34,211,238,0.22)',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  spark: {
    position: 'absolute',
    zIndex: 1,
  },
});
