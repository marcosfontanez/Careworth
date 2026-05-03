import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';

export function CoCreateRoadmapCard() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Ionicons name="people-outline" size={20} color={colors.status.invite} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Co-create slots</Text>
        <Text style={styles.sub}>
          Shared multi-clip projects: open the hub to create a project and assign slots. For multi-part stories today,
          use clip queue + series mode in the video composer.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push('/create/collab')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Open co-create hub</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary.teal} />
        </TouchableOpacity>
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
    backgroundColor: colors.status.invite + '10',
    borderWidth: 1,
    borderColor: colors.status.invite + '44',
  },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4, lineHeight: 15 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  btnText: { fontSize: 12, fontWeight: '800', color: colors.primary.teal },
});
