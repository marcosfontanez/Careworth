import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  onPress: () => void;
};

export function ViewerPollPill({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.pill} accessibilityLabel="Open active poll">
      <Ionicons name="stats-chart" size={13} color={colors.primary.teal} />
      <Text style={styles.txt}>Poll active</Text>
      <Ionicons name="chevron-up" size={12} color={colors.primary.teal} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.32)',
    marginBottom: 8,
  },
  txt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.white,
    letterSpacing: 0.2,
  },
});
