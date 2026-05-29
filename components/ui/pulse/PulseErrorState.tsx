import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pulseColors, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { PulseButton } from './PulseButton';

type Props = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Error state with optional retry — danger accent, premium spacing. */
export function PulseErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  retryLabel = 'Try again',
  onRetry,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <View style={styles.iconRing}>
        <Ionicons name="alert-circle-outline" size={28} color={pulseColors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PulseButton label={retryLabel} onPress={onRetry} variant="secondary" style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: pulseSpacing['2xl'],
    paddingVertical: pulseSpacing['3xl'],
    gap: pulseSpacing.md,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  title: { ...pulseTypography.sectionTitle, textAlign: 'center' },
  message: { ...pulseTypography.bodySmall, textAlign: 'center', maxWidth: 320 },
  cta: { marginTop: pulseSpacing.sm },
});
