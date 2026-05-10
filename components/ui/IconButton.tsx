import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
  type PressableStateCallbackType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, borderRadius, pulseverse, semantic, touchTarget, iconSize } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type IconButtonProps = {
  name: IonName;
  onPress?: (e: GestureResponderEvent) => void;
  /** `default` — neutral dark chrome; `accent` — cyan rim (shop entry). */
  variant?: 'default' | 'accent';
  size?: 'md' | 'lg';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Square icon affordance with consistent hit target and rim treatment.
 */
export function IconButton({
  name,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const dim = size === 'lg' ? touchTarget.min : 44;
  const icon = size === 'lg' ? iconSize.lg : iconSize.md;

  const pressed = useMemo<StyleProp<ViewStyle>>(
    () => ({ opacity: disabled ? 1 : 0.88 }),
    [disabled],
  );

  const resolveStyle = ({ pressed: isPressed }: PressableStateCallbackType) => [
    styles.base,
    {
      width: dim,
      height: dim,
      borderRadius: borderRadius.lg,
      borderColor: variant === 'accent' ? pulseverse.sparksPillBorder : semantic.borderSubtle,
      backgroundColor: variant === 'accent' ? pulseverse.sparksPillBg : 'rgba(255,255,255,0.06)',
    },
    isPressed ? pressed : null,
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={resolveStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Ionicons name={name} size={icon} color={variant === 'accent' ? pulseverse.electric : colors.dark.text} />
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
});
