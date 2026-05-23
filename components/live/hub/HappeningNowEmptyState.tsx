import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, spacing, typography } from '@/theme';

type Props = {
  onGoLive: () => void;
  /** When false, hide the Go Live CTA (e.g. unsigned viewers). */
  showGoLive?: boolean;
};

/** Empty Happening Now — premium glass card with optional Go Live CTA. */
export function HappeningNowEmptyState({ onGoLive, showGoLive = true }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(12,18,32,0.88)', 'rgba(18,26,44,0.92)']}
        style={styles.card}
      >
        <LinearGradient
          colors={['rgba(56,189,248,0.14)', 'rgba(236,72,153,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glow}
        />
        <View style={styles.iconWrap}>
          <Ionicons name="radio-outline" size={28} color={colors.primary.teal} />
        </View>
        <Text style={styles.title}>No live streams right now</Text>
        <Text style={styles.subtitle}>Start a stream or check back soon.</Text>
        {showGoLive ? (
          <Pressable
            onPress={onGoLive}
            style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
          >
            <LinearGradient
              colors={[colors.primary.teal, '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Ionicons name="videocam" size={18} color="#0B1220" />
              <Text style={styles.ctaTxt}>Go Live</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: borderRadius['3xl'] - 4,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
    lineHeight: 20,
  },
  ctaWrap: { marginTop: spacing.lg },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ctaTxt: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1220',
  },
});
