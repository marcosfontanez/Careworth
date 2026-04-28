import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/theme';

type Props = {
  height: number;
};

/** Full-viewport empty state over black video canvas — typography aligned with PulseVerse dark UI */
export function FeedEmptyState({ height }: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      <Ionicons name="newspaper-outline" size={48} color={colors.feed.emptyIcon} />
      <Text style={styles.title}>No posts yet</Text>
      <Text style={styles.sub}>Be the first to share something.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.dark.text,
    textAlign: 'center',
  },
  sub: {
    ...typography.bodySmall,
    color: colors.feed.emptySubtext,
    textAlign: 'center',
  },
});
