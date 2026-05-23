import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import type { StreamPoll } from '@/types';

type Props = {
  poll: StreamPoll;
  onPress: () => void;
};

/** Compact poll indicator — opens full poll sheet on tap. */
export function LivePollChip({ poll, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open poll: ${poll.question}`}
    >
      <Ionicons name="bar-chart" size={14} color={colors.primary.teal} />
      <Text style={styles.text} numberOfLines={1}>
        {poll.question}
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeTxt}>Vote</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  chipPressed: { opacity: 0.9 },
  text: {
    ...typography.caption,
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.3,
  },
});
