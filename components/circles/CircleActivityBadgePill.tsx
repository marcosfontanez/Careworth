import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, pulseverse, rhythm } from '@/theme';
import type { CircleActivityBadgeLabel } from '@/lib/circleActivityBadges';

const TONE_COLOR: Record<CircleActivityBadgeLabel['tone'], string> = {
  reply: colors.primary.teal,
  post: pulseverse.electric,
  question: colors.status.warning,
  hot: '#FB7185',
};

type Props = {
  label: CircleActivityBadgeLabel;
};

export function CircleActivityBadgePill({ label }: Props) {
  const color = TONE_COLOR[label.tone];
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
    minHeight: rhythm.chipHeight,
    justifyContent: 'center',
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
});
