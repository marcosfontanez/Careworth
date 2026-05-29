import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { pulseColors, pulseRadius, pulseShadows, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IonName;
  label: string;
  onPress?: () => void;
  subtitle?: string;
  tone?: 'default' | 'teal' | 'gift' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Square action tile for studio grids and quick actions. */
export function PulseActionTile({
  icon,
  label,
  onPress,
  subtitle,
  tone = 'default',
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const iconColor =
    tone === 'teal'
      ? pulseColors.teal
      : tone === 'gift'
        ? pulseColors.gift
        : tone === 'danger'
          ? pulseColors.danger
          : pulseColors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.tile,
        toneBorder[tone],
        pulseShadows.subtle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.iconWrap, toneIconWrap[tone]]}>
        <Ionicons name={icon} size={20} color={disabled ? pulseColors.textQuiet : iconColor} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 96,
    padding: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    borderWidth: 1,
    backgroundColor: pulseColors.glass,
    gap: pulseSpacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: pulseRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: { ...pulseTypography.cardTitle, fontSize: 13 },
  subtitle: { ...pulseTypography.caption, lineHeight: 16 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});

const toneBorder = StyleSheet.create({
  default: { borderColor: pulseColors.border },
  teal: { borderColor: pulseColors.borderAccent },
  gift: { borderColor: 'rgba(246, 196, 83, 0.28)' },
  danger: { borderColor: 'rgba(248, 113, 113, 0.28)' },
});

const toneIconWrap = StyleSheet.create({
  default: { backgroundColor: 'rgba(15, 28, 48, 0.72)', borderColor: pulseColors.border },
  teal: { backgroundColor: 'rgba(25, 211, 197, 0.12)', borderColor: pulseColors.borderAccent },
  gift: { backgroundColor: 'rgba(246, 196, 83, 0.12)', borderColor: 'rgba(246, 196, 83, 0.28)' },
  danger: { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.28)' },
});
