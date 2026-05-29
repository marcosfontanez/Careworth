import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  /** Compact label under the pulse graphic. */
  label?: string;
};

/**
 * Branded hero fill when a live stream has no thumbnail — navy base, teal/purple glow, pulse waves.
 * Metadata (title, host, CTA) is rendered by {@link FeaturedLiveCard} above this layer.
 */
export function LiveHeroPlaceholder({ label = 'LIVE NOW' }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    const waveLoop = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 3200, useNativeDriver: true }),
    );
    pulseLoop.start();
    waveLoop.start();
    return () => {
      pulseLoop.stop();
      waveLoop.stop();
    };
  }, [pulse, wave]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const waveShift = wave.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#060E1A', '#0C1628', '#101E38', '#0A1220']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.18)', 'rgba(99,102,241,0.14)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cornerGlow}
      />
      <LinearGradient
        colors={['transparent', 'rgba(236,72,153,0.12)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.pinkVeil}
      />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ringOuter,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ringMid,
            { opacity: ringOpacity, transform: [{ scale: pulse }] },
          ]}
        />
        <View style={styles.core}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>{label}</Text>
        </View>
      </View>

      <Animated.View style={[styles.waveRow, { transform: [{ translateX: waveShift }] }]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.waveBar, { height: 18 + (i % 3) * 10, opacity: 0.25 + (i % 2) * 0.15 }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  pinkVeil: {
    position: 'absolute',
    bottom: '28%',
    left: 0,
    right: 0,
    height: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  ringOuter: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
  },
  ringMid: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  core: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.live,
  },
  liveLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#A5F3FC',
  },
  waveRow: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary.teal,
  },
});
