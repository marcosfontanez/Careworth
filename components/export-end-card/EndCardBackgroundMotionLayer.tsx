import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { exportEndCardTokens } from '@/theme/exportEndCard';
import type { EndCardTheme } from '@/types/exportEndCard';

type Props = {
  width: number;
  height: number;
  theme: EndCardTheme;
  animationEnabled: boolean;
};

/**
 * Subtle orbit + pulse sweep — restrained motion for premium export slate.
 */
export function EndCardBackgroundMotionLayer({ width, height, theme, animationEnabled }: Props) {
  const orbit = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!animationEnabled) {
      orbit.value = 0;
      sweep.value = 0;
      return;
    }
    orbit.value = withRepeat(
      withTiming(1, {
        duration: exportEndCardTokens.timing.orbitPeriodMs,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    sweep.value = withRepeat(
      withTiming(1, {
        duration: exportEndCardTokens.timing.pulseSweepPeriodMs,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [animationEnabled, orbit, sweep]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(orbit.value, [0, 1], [0, 360])}deg` }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(sweep.value, [0, 1], [-width * 0.35, width * 0.35]),
      },
    ],
    opacity: interpolate(sweep.value, [0, 0.5, 1], [0.2, 0.45, 0.2]),
  }));

  const r = Math.min(width, height) * 0.42;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <View style={[styles.glowBlob, { backgroundColor: theme.accentGlow, top: -height * 0.08, right: -width * 0.15 }]} />
      <View style={[styles.glowBlob, { backgroundColor: 'rgba(25, 211, 197, 0.12)', bottom: -height * 0.12, left: -width * 0.2 }]} />

      <Animated.View style={[styles.ringWrap, { width: r * 2, height: r * 2, top: height * 0.08, alignSelf: 'center' }, ringStyle]}>
        <View style={[styles.ring, { width: r * 2, height: r * 2, borderRadius: r, borderColor: `${theme.accentLine}22` }]} />
        <View
          style={[
            styles.ringInner,
            {
              width: r * 1.55,
              height: r * 1.55,
              borderRadius: r * 0.775,
              borderColor: `${theme.accentLine}14`,
            },
          ]}
        />
      </Animated.View>

      <Animated.View style={[styles.sweepRow, { top: height * 0.62 }, sweepStyle]}>
        <LinearGradient
          colors={['transparent', theme.accentLine, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sweepGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowBlob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.9,
  },
  ringWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  ringInner: {
    position: 'absolute',
    borderWidth: 1,
  },
  sweepRow: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  sweepGradient: {
    width: 140,
    height: 2,
    borderRadius: 1,
  },
});
