import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, borderRadius } from '@/theme';

interface Props {
  tags: string[];
  /** Match compact profile mocks: chips only, no section title. */
  hideLabel?: boolean;
}

/** Identity chips — culture-first; tags may include leading emoji from profile. */
export function IdentityTags({ tags, hideLabel }: Props) {
  if (!tags.length) return null;
  return (
    <View style={styles.wrap}>
      {!hideLabel ? <Text style={styles.kicker}>Identity</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.chip, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={styles.chipText}>{tag}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.dark.textSecondary,
    marginBottom: 10,
  },
  scroll: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.dark.text },
});
