import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

/**
 * Smart cover hint — appears on the first photo slide reminding the user
 * that it becomes the cover. Pure cosmetic; the parent already enforces
 * "first slide is cover" semantics.
 */
export function SmartCoverHint() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>COVER</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.primary.teal,
  },
  text: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
