import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme';

export function SpecialtyBadge({ specialty, variant = 'overlay' }: { specialty: string; variant?: 'overlay' | 'card' }) {
  const card = variant === 'card';
  return (
    <View
      style={[
        styles.badge,
        card && { backgroundColor: colors.dark.cardAlt, borderWidth: 1, borderColor: colors.dark.border },
      ]}
    >
      <Text style={[styles.text, card && { color: colors.dark.textSecondary }]}>{specialty}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
  },
  text: { color: '#FFF', fontSize: 10, fontWeight: '600', letterSpacing: 0.15 },
});
