import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { PulseTapBurst, PulseTapVariant } from '@/hooks/usePulseTapReaction';

type Props = {
  bursts: PulseTapBurst[];
  onBurstDone: (id: string) => void;
};

const VARIANT_META: Record<
  PulseTapVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; ring: string }
> = {
  heart: { icon: 'heart', color: '#F9A8D4', ring: 'rgba(236,72,153,0.35)' },
  pulse: { icon: 'pulse', color: colors.primary.teal, ring: 'rgba(34,211,238,0.35)' },
  spark: { icon: 'sparkles', color: '#C4B5FD', ring: 'rgba(167,139,250,0.35)' },
};

function PulseWave({ burst, onDone }: { burst: PulseTapBurst; onDone: () => void }) {
  const rise = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const meta = VARIANT_META[burst.variant];

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 1200, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
  }, [fade, onDone, ring, rise]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -132] });
  const scale = rise.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.55, 1.06, 0.88] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.65] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.55, 0.35, 0] });

  return (
    <Animated.View
      style={[
        styles.burstWrap,
        {
          opacity: fade,
          transform: [{ translateY }, { translateX: burst.xOffset }],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: meta.ring,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View style={[styles.burst, { transform: [{ scale }] }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </Animated.View>
    </Animated.View>
  );
}

/** Lightweight rising pulse reactions over the live player (local-only). */
export function PulseTapOverlay({ bursts, onBurstDone }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {bursts.map((burst) => (
        <PulseWave key={burst.id} burst={burst} onDone={() => onBurstDone(burst.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 118,
    zIndex: 16,
  },
  burstWrap: {
    position: 'absolute',
    bottom: 96,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  burst: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(12,18,32,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
