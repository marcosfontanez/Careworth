import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { pulseverse, pvKit, spacing } from '@/theme';

export type PVBalancePillProps = {
  /** e.g. formatted sparks count */
  label: string;
  leftSlot?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
};

/** Sparks / soft-currency balance chrome — shelf + cyan rim. */
export function PVBalancePill({ label, leftSlot, onPress, style, labelStyle, testID }: PVBalancePillProps) {
  const inner = (
    <>
      {leftSlot}
      <Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        testID={testID}
        style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, style]} testID={testID}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: pvKit.pill.radius,
    borderWidth: 1,
    borderColor: pvKit.balancePill.border,
    backgroundColor: pvKit.balancePill.fill,
  },
  label: {
    color: pulseverse.electricSoft,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.9 },
});
