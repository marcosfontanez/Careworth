import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  pulseColors,
  pulseGradients,
  pulseRadius,
  pulseShadows,
  pulseSpacing,
  type PulseCardVariant,
} from '@/lib/theme/pulseTheme';

type Props = {
  children: React.ReactNode;
  variant?: PulseCardVariant;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/** Standard PulseVerse surface card — default, glass, elevated, danger, or gift. */
export function PulseCard({ children, variant = 'default', style, padded = true }: Props) {
  if (variant === 'glass') {
    return (
      <View style={[styles.base, styles.glassOuter, pulseShadows.card, style]}>
        <LinearGradient colors={[...pulseGradients.secondaryVeil]} style={[styles.glassInner, padded && styles.padded]}>
          {children}
        </LinearGradient>
      </View>
    );
  }

  const variantStyle =
    variant === 'elevated'
      ? [styles.elevated, pulseShadows.elevated]
      : variant === 'danger'
        ? [styles.danger, pulseShadows.subtle]
        : variant === 'gift'
          ? [styles.gift, pulseShadows.glowGift]
          : [styles.default, pulseShadows.card];

  return (
    <View style={[styles.base, ...variantStyle, style]}>
      {variant === 'gift' ? (
        <LinearGradient colors={[...pulseGradients.gift]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      ) : null}
      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: pulseRadius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: pulseSpacing.lg },
  default: {
    backgroundColor: pulseColors.surface,
    borderColor: pulseColors.border,
  },
  glassOuter: {
    borderColor: pulseColors.borderStrong,
    backgroundColor: pulseColors.glass,
  },
  glassInner: {
    borderRadius: pulseRadius.card,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: pulseColors.surfaceElevated,
    borderColor: pulseColors.borderAccent,
  },
  danger: {
    backgroundColor: 'rgba(69, 10, 10, 0.42)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  gift: {
    backgroundColor: pulseColors.surface,
    borderColor: 'rgba(246, 196, 83, 0.28)',
  },
});
