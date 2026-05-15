import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, pulseverse, pvKit } from '@/theme';

export type PVSecondaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

/** Secondary CTA — dark shelf fill, cyan outline, electric-soft label. */
export function PVSecondaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  testID,
}: PVSecondaryButtonProps) {
  const dim = Boolean(disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.touch,
        dim && styles.dimmed,
        pressed && !dim && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={pulseverse.electricSoft} />
      ) : (
        <Text style={[styles.label, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pvKit.secondaryCta.fill,
    borderWidth: 1,
    borderColor: pvKit.secondaryCta.border,
  },
  label: {
    color: pvKit.secondaryCta.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dimmed: { opacity: 0.5 },
  pressed: { backgroundColor: colors.dark.cardAlt },
});
