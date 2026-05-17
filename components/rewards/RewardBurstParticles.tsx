import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');

/** Drives celebration FX behind the gift box / reward in {@link RewardRevealModal} (bursts under sprites). */
export type RewardBurstVisualPhase = 'off' | 'explosion' | 'ambient';

type Props = {
  phase: RewardBurstVisualPhase;
  /** Hue 0–360 for cyan/gold accents */
  accentHue?: number;
};

export function RewardBurstParticles({ phase, accentHue = 48 }: Props) {
  if (phase === 'off') return null;
  if (phase === 'explosion') return <ExplosionCelebration accentHue={accentHue} />;
  return <AmbientGlow accentHue={accentHue} />;
}

/** One-shot radial blast + core flash — premium “unbox” beat. */
function ExplosionCelebration({ accentHue }: { accentHue: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: 580, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [progress]);

  const angles = useMemo(
    () => Array.from({ length: 40 }, (_, i) => (i / 40) * Math.PI * 2 + (i % 3) * 0.09),
    [],
  );

  return (
    <View style={styles.layer} pointerEvents="none">
      <ExplosionCore progress={progress} hue={accentHue} />
      <ExplosionRing progress={progress} hue={accentHue} />
      {angles.map((angle, i) => (
        <OutboundSpark key={i} angle={angle} index={i} progress={progress} hue={accentHue} />
      ))}
    </View>
  );
}

function ExplosionCore({ progress, hue }: { progress: SharedValue<number>; hue: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.28, 0.62], [0, 1, 0.72, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.12, 0.55, 1], [0.08, 1.35, 1.85, 2.25], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 112,
          height: 112,
          borderRadius: 56,
          backgroundColor: `hsla(${hue}, 96%, 62%, 0.45)`,
          shadowColor: `hsl(${hue}, 92%, 58%)`,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 36,
        },
        style,
      ]}
    />
  );
}

function ExplosionRing({ progress, hue }: { progress: SharedValue<number>; hue: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.06, 0.35, 0.75], [0, 0.55, 0.35, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.45, 1], [0.35, 1.55, 2.05], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: W * 0.42,
          height: W * 0.42,
          borderRadius: W * 0.21,
          borderWidth: 2,
          borderColor: `hsla(${hue}, 100%, 72%, 0.65)`,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    />
  );
}

function OutboundSpark({
  angle,
  index,
  progress,
  hue,
}: {
  angle: number;
  index: number;
  progress: SharedValue<number>;
  hue: number;
}) {
  const dist = 96 + (index % 7) * 19;
  const small = index % 3 === 0;

  const style = useAnimatedStyle(() => {
    const travel = interpolate(progress.value, [0, 1], [0, dist], Extrapolation.CLAMP);
    return {
      opacity: interpolate(progress.value, [0, 0.04, 0.88, 1], [0, 1, 0.42, 0], Extrapolation.CLAMP),
      transform: [{ translateX: Math.cos(angle) * travel }, { translateY: Math.sin(angle) * travel }],
    };
  });

  const size = small ? 5 : 8;
  return (
    <Animated.View
      style={[
        style,
        styles.sparkAnchor,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsla(${hue}, 100%, 78%, 0.98)`,
          shadowColor: '#fff',
          shadowOpacity: 0.55,
          shadowRadius: 6,
        },
      ]}
    />
  );
}

/** Soft breathing halo while the reward orb / border is showcased. */
function AmbientGlow({ accentHue }: { accentHue: number }) {
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 980, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + pulse.value * 0.38,
    transform: [{ scale: 0.9 + pulse.value * 0.14 }],
  }));

  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const r = 0.34 + (i % 4) * 0.035;
        return {
          key: i,
          left: W * 0.5 + Math.cos(angle) * W * r - 3,
          top: W * 0.38 + Math.sin(angle) * W * r * 0.62 - 3,
          delay: i * 24,
          small: i % 2 === 0,
        };
      }),
    [],
  );

  return (
    <View style={styles.layer} pointerEvents="none">
      <Animated.View
        style={[
          styles.ambientCore,
          glowStyle,
          {
            backgroundColor: `hsla(${accentHue}, 92%, 58%, 0.18)`,
            shadowColor: `hsl(${accentHue}, 88%, 52%)`,
          },
        ]}
      />
      {dots.map((d) => (
        <AmbientParticle key={d.key} left={d.left} top={d.top} small={d.small} hue={accentHue} delay={d.delay} />
      ))}
    </View>
  );
}

function AmbientParticle({
  left,
  top,
  small,
  hue,
  delay,
}: {
  left: number;
  top: number;
  small: boolean;
  hue: number;
  delay: number;
}) {
  const o = useSharedValue(0);
  React.useEffect(() => {
    const t = setTimeout(() => {
      o.value = withRepeat(
        withTiming(1, { duration: 520 + (delay % 200), easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, o]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.12 + o.value * 0.48,
    transform: [{ scale: small ? 0.82 + o.value * 0.36 : 1 + o.value * 0.26 }],
  }));
  const size = small ? 5 : 7;
  return (
    <Animated.View
      style={[
        style,
        styles.dot,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsla(${hue}, 100%, 72%, 0.88)`,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkAnchor: {
    position: 'absolute',
  },
  ambientCore: {
    position: 'absolute',
    width: W * 0.68,
    height: W * 0.68,
    borderRadius: W * 0.34,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 36,
  },
  dot: {
    position: 'absolute',
  },
});
