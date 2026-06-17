import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';

type Props = {
  count: number;
  marked: boolean;
  accent?: string;
  disabled?: boolean;
  onPress?: () => void;
};

/** Lightweight Helpful vote — not a downvote; toggles per user. */
export function CircleReplyHelpfulButton({ count, marked, accent, disabled, onPress }: Props) {
  const tint = accent ?? colors.primary.teal;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.85}
      style={[
        styles.btn,
        marked && { borderColor: `${tint}88`, backgroundColor: `${tint}18` },
        disabled && styles.btnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={marked ? 'Remove Helpful mark' : 'Mark reply as Helpful'}
      accessibilityState={{ selected: marked }}
    >
      <Ionicons
        name={marked ? 'thumbs-up' : 'thumbs-up-outline'}
        size={15}
        color={marked ? tint : colors.dark.textMuted}
      />
      <Text style={[styles.label, marked && { color: tint, fontWeight: '700' }]}>
        Helpful{count > 0 ? ` · ${formatCount(count)}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
  },
  btnDisabled: { opacity: 0.45 },
  label: { fontSize: 12, color: colors.dark.textMuted, fontWeight: '600' },
});
