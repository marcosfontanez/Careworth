import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  compact?: boolean;
  showResume?: boolean;
  onResume?: () => void;
};

/** Branded full-screen overlay while the host is in BRB mode (stream stays live). */
export function LiveBrbOverlay({ compact = false, showResume = true, onResume }: Props) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <LinearGradient
        colors={['#060E1A', '#0C1628', '#101E38']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.14)', 'transparent', 'rgba(139,92,246,0.16)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.pulseRing, { opacity: pulse, transform: [{ scale: pulse }] }]} />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.iconRing, compact && styles.iconRingCompact]}>
          <Ionicons name="pause-circle-outline" size={compact ? 28 : 42} color={colors.primary.teal} />
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>Be Right Back</Text>
        <Text style={styles.subtitle}>PulseVerse Live</Text>
        {!compact ? (
          <Text style={styles.meta}>The host stepped away — chat stays open.</Text>
        ) : null}
        {showResume && onResume ? (
          <Pressable onPress={onResume} style={styles.resumeBtn}>
            <Ionicons name="play-circle-outline" size={18} color={colors.dark.bg} />
            <Text style={styles.resumeTxt}>Resume camera</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  wrapCompact: { position: 'relative', flex: 1 },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  contentCompact: { paddingHorizontal: 12, gap: 6 },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    marginBottom: 8,
  },
  iconRingCompact: { width: 56, height: 56, borderRadius: 28, marginBottom: 4 },
  title: {
    ...typography.h1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.white,
    letterSpacing: -0.4,
  },
  titleCompact: { fontSize: 16 },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  meta: {
    ...typography.bodySmall,
    color: 'rgba(248,250,252,0.62)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  resumeBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
  },
  resumeTxt: { ...typography.button, fontWeight: '800', color: colors.dark.bg },
});
