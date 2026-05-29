import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  pulseColors,
  pulseGradients,
  pulseRadius,
  pulseShadows,
  pulseSpacing,
  pulseTypography,
  type PulseButtonVariant,
} from '@/lib/theme/pulseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: PulseButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: IonName;
  rightIcon?: IonName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** PulseVerse button — primary, secondary, ghost, danger, gift + loading/disabled. */
export function PulseButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;

  const content = (
    <View style={[styles.row, fullWidth && styles.fullWidth]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? pulseColors.teal : pulseColors.onAccent}
        />
      ) : (
        <>
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={18}
              color={labelColor(variant, isDisabled)}
              style={styles.iconLeft}
            />
          ) : null}
          <Text style={[styles.label, { color: labelColor(variant, isDisabled) }]}>{label}</Text>
          {rightIcon ? (
            <Ionicons name={rightIcon} size={16} color={labelColor(variant, isDisabled)} />
          ) : null}
        </>
      )}
    </View>
  );

  const shellStyle = useMemo(
    () => [styles.base, fullWidth && styles.fullWidth, isDisabled && styles.disabled, style],
    [fullWidth, isDisabled, style],
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [shellStyle, pressed && !isDisabled && styles.pressed, pulseShadows.glowTeal]}
      >
        <LinearGradient colors={[...pulseGradients.primaryCta]} style={styles.fill}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'gift') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [shellStyle, pressed && !isDisabled && styles.pressed, pulseShadows.glowGift]}
      >
        <LinearGradient colors={[...pulseGradients.gift]} style={styles.fill}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  const flatStyle = [
    styles.base,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    variant === 'danger' && styles.danger,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [flatStyle, pressed && !isDisabled && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function labelColor(variant: PulseButtonVariant, disabled: boolean): string {
  if (disabled) return pulseColors.textQuiet;
  switch (variant) {
    case 'ghost':
      return pulseColors.teal;
    case 'danger':
      return pulseColors.onDanger;
    case 'gift':
      return pulseColors.onGift;
    case 'secondary':
      return pulseColors.text;
    default:
      return pulseColors.onAccent;
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: pulseRadius.button,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fill: {
    minHeight: 48,
    paddingHorizontal: pulseSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: pulseSpacing.sm,
    paddingHorizontal: pulseSpacing.xl,
    minHeight: 48,
  },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  label: { ...pulseTypography.button },
  iconLeft: { marginRight: -2 },
  secondary: {
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  danger: {
    backgroundColor: 'rgba(220, 38, 38, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
