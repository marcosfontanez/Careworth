import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export function BrollSoonCard() {
  return (
    <View style={styles.wrap}>
      <Ionicons name="git-merge-outline" size={20} color={colors.primary.royal} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>B-roll inserts (roadmap)</Text>
        <Text style={styles.sub}>
          Main clip + cutaway shots in one timeline is a larger editor build. For now, stitch clips with Multi-clip stitch
          or trim in an external app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primary.royal + '12',
    borderWidth: 1,
    borderColor: colors.primary.royal + '40',
  },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4, lineHeight: 15 },
});
