import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { pulseverse, pvKit } from '@/theme';
import { colors } from '@/theme/colors';

export type PVPillVariant = 'neutral' | 'accent' | 'muted';

export type PVPillProps = {
  label: string;
  variant?: PVPillVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftSlot?: React.ReactNode;
  testID?: string;
};

const variantStyles: Record<
  PVPillVariant,
  { border: string; bg: string; text: string }
> = {
  neutral: {
    border: pvKit.card.borderSubtle,
    bg: 'rgba(15,23,42,0.72)',
    text: colors.dark.textSecondary,
  },
  accent: {
    border: 'rgba(34,211,238,0.35)',
    bg: 'rgba(34,211,238,0.12)',
    text: pulseverse.electricSoft,
  },
  muted: {
    border: 'rgba(148,163,184,0.18)',
    bg: 'rgba(15,23,42,0.55)',
    text: colors.dark.textMuted,
  },
};

/** Compact chip / status pill — PulseVerse chrome. */
export function PVPill({ label, variant = 'neutral', style, textStyle, leftSlot, testID }: PVPillProps) {
  const v = variantStyles[variant];
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: v.border,
          backgroundColor: v.bg,
          paddingHorizontal: pvKit.pill.padH,
          paddingVertical: pvKit.pill.padV,
        },
        style,
      ]}
      testID={testID}
    >
      {leftSlot}
      <Text style={[styles.text, { color: v.text }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: pvKit.pill.radius,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
});
