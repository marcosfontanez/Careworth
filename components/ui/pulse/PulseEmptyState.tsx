import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { pulseColors, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { PulseButton } from './PulseButton';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon?: IonName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Intentional empty state — icon, title, optional CTA. */
export function PulseEmptyState({
  icon = 'planet-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="text">
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={28} color={pulseColors.teal} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PulseButton label={actionLabel} onPress={onAction} variant="secondary" style={styles.cta} />
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
    backgroundColor: 'rgba(25, 211, 197, 0.1)',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  title: { ...pulseTypography.sectionTitle, textAlign: 'center' },
  message: { ...pulseTypography.bodySmall, textAlign: 'center', maxWidth: 320 },
  cta: { marginTop: pulseSpacing.sm },
});
