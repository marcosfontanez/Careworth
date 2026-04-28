import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from '@/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 20;
const USE_NATIVE = Platform.OS !== 'web';

const COLORS = [
  colors.primary.royal,
  colors.primary.teal,
  colors.primary.gold,
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

interface Props {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
}

function Particle({ delay, x }: { delay: number; x: number }) {
  const y = useRef(new Animated.Value(SCREEN_H)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = 6 + Math.random() * 8;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: -100,
          duration: 1400 + Math.random() * 600,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() * 4,
          duration: 1800,
          useNativeDriver: USE_NATIVE,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? size / 2 : 2,
        backgroundColor: color,
        transform: [
          { translateY: y },
          { rotate: rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '720deg'] }) },
        ],
        opacity,
      }}
    />
  );
}

export function SuccessAnimation({ visible, message = 'Posted!', onComplete }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: USE_NATIVE }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE }),
        ]),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: USE_NATIVE }),
      ]).start(() => onComplete?.());

      // Fallback timer in case animation callback doesn't fire
      const fallback = setTimeout(() => onComplete?.(), 2500);
      return () => clearTimeout(fallback);
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle
          key={i}
          delay={Math.random() * 400}
          x={SCREEN_W * 0.15 + Math.random() * SCREEN_W * 0.7}
        />
      ))}
      <Animated.View style={[styles.badge, { transform: [{ scale }], opacity }]}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

export function HeartBurst({ visible }: { visible: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      opacity.setValue(1);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: USE_NATIVE }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: USE_NATIVE }),
        ]),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.Text
      style={[styles.heartBurst, { transform: [{ scale }], opacity, pointerEvents: 'none' }]}
    >
      ❤️
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  badge: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
    elevation: 10,
  },
  checkmark: { fontSize: 36, color: colors.primary.teal },
  message: { fontSize: 18, fontWeight: '800', color: colors.neutral.darkText },
  heartBurst: {
    position: 'absolute',
    fontSize: 80,
    alignSelf: 'center',
    zIndex: 100,
  },
});
