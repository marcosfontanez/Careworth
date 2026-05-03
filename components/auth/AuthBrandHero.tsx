import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography } from '@/theme';

const LOGO = require('../../assets/images/pulseverse-logo.png');

type Props = {
  title?: string;
  subtitle?: string;
  kicker?: string;
};

export function AuthBrandHero({ title = 'PulseVerse', subtitle = 'Built for Healthcare Life.', kicker }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.primary.teal + '33', colors.primary.royal + '22', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.logoRing}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="PulseVerse logo" />
      </View>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tagRow}>
        <View style={styles.tagAccent} />
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.tagAccent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: spacing.xl },
  glow: {
    position: 'absolute',
    top: -20,
    left: '12%',
    right: '12%',
    height: 120,
    borderRadius: borderRadius.xl,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    padding: 3,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.primary.teal + '66',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: { width: 80, height: 80 },
  kicker: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary.teal,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.6,
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  tagAccent: {
    width: 28,
    height: 2,
    backgroundColor: colors.primary.teal,
    opacity: 0.55,
    borderRadius: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    fontWeight: '600',
  },
});
