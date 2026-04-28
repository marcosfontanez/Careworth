import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type LoaderSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<LoaderSize, { icon: number; ring: number; dot: number; dotSpacing: number }> = {
  small: { icon: 20, ring: 36, dot: 4, dotSpacing: 6 },
  medium: { icon: 32, ring: 56, dot: 6, dotSpacing: 8 },
  large: { icon: 48, ring: 80, dot: 8, dotSpacing: 10 },
};

interface PulseLoaderProps {
  size?: LoaderSize;
  color?: string;
  style?: ViewStyle;
}

export function PulseLoader({
  size = 'medium',
  color = colors.primary.teal,
  style,
}: PulseLoaderProps) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  const dims = SIZE_MAP[size];

  useEffect(() => {
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.25,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ]),
    );

    const ring = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.6,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(480),
      ]),
    );

    const makeDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    heartbeat.start();
    ring.start();
    makeDotAnim(dot1, 0).start();
    makeDotAnim(dot2, 200).start();
    makeDotAnim(dot3, 400).start();

    return () => {
      heartbeat.stop();
      ring.stop();
    };
  }, [heartScale, ringScale, ringOpacity, dot1, dot2, dot3]);

  return (
    <View style={[styles.loaderContainer, style]}>
      <View style={{ width: dims.ring, height: dims.ring, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: dims.ring,
              height: dims.ring,
              borderRadius: dims.ring / 2,
              borderColor: color,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        <Animated.View style={{ position: 'absolute', transform: [{ scale: heartScale }] }}>
          <Ionicons name="heart" size={dims.icon} color={color} />
        </Animated.View>
      </View>

      <View style={[styles.dotsRow, { marginTop: dims.dotSpacing }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dims.dot,
                height: dims.dot,
                borderRadius: dims.dot / 2,
                backgroundColor: color,
                opacity: dot,
                marginHorizontal: dims.dot * 0.6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

interface SkeletonPulseProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonPulse({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonPulseProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.5],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.dark.cardAlt,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {},
});
