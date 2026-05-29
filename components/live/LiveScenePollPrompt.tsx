import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  question: string;
  compact?: boolean;
};

/** Prominent poll prompt overlay — video stays visible underneath. */
export function LiveScenePollPrompt({ question, compact }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(15,28,48,0.94)', 'rgba(46,16,101,0.52)']}
        style={styles.card}
      >
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={16} color={colors.primary.teal} />
          <Text style={styles.label}>Live poll</Text>
        </View>
        <Text style={styles.question} numberOfLines={compact ? 2 : 3}>
          {question}
        </Text>
        <Text style={styles.hint}>Tap Poll in the bar to vote</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 108,
    zIndex: 8,
  },
  wrapCompact: {
    bottom: 16,
    left: 8,
    right: 8,
  },
  card: {
    padding: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.32)',
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  question: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.neutral.white,
    lineHeight: 20,
  },
  hint: {
    ...typography.caption,
    color: colors.dark.textMuted,
  },
});
