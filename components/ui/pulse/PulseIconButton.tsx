import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { pulseColors, pulseRadius, pulseSpacing } from '@/lib/theme/pulseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IonName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'teal' | 'danger' | 'gift' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZE_MAP = { sm: 36, md: 44, lg: 52 } as const;
const ICON_MAP = { sm: 16, md: 20, lg: 22 } as const;

/** Compact circular icon control for toolbars and overlays. */
export function PulseIconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 'md',
  tone = 'default',
  disabled = false,
  style,
}: Props) {
  const dim = SIZE_MAP[size];
  const iconColor =
    tone === 'teal'
      ? pulseColors.teal
      : tone === 'danger'
        ? pulseColors.danger
        : tone === 'gift'
          ? pulseColors.gift
          : tone === 'ghost'
            ? pulseColors.text
            : pulseColors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        toneStyles[tone],
        { width: dim, height: dim, borderRadius: dim / 2 },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={ICON_MAP[size]} color={disabled ? pulseColors.textQuiet : iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: 'rgba(15, 28, 48, 0.72)',
    borderColor: pulseColors.border,
  },
  teal: {
    backgroundColor: 'rgba(25, 211, 197, 0.12)',
    borderColor: pulseColors.borderAccent,
  },
  danger: {
    backgroundColor: 'rgba(69, 10, 10, 0.55)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  gift: {
    backgroundColor: 'rgba(246, 196, 83, 0.12)',
    borderColor: 'rgba(246, 196, 83, 0.28)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: pulseColors.border,
  },
});
