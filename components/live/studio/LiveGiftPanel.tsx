import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  giftsEnabled: boolean;
};

export function LiveGiftPanel({ giftsEnabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Ionicons name="gift-outline" size={28} color={colors.primary.gold} />
        <Text style={styles.title}>Creator gifts</Text>
        <Text style={styles.meta}>
          {giftsEnabled
            ? 'Viewers send Sparks creator gifts from the Gift tray on their dock. Orbs animate on stream and the live leaderboard updates in real time.'
            : 'Creator gifts are disabled for this stream.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  card: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.22)',
  },
  title: { ...typography.h3, fontSize: 16, color: colors.neutral.white },
  meta: { ...typography.bodySmall, color: colors.dark.textMuted, textAlign: 'center', lineHeight: 20 },
});
