import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '@/theme';

type Props = {
  streamTitle: string;
  onClose: () => void;
};

export function LiveStudioHeader({ streamTitle, onClose }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Back to camera"
      >
        <Ionicons name="chevron-down" size={22} color="#FFF" />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>Live Studio</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {streamTitle}
        </Text>
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pressed: { opacity: 0.88 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  spacer: { width: 40 },
  title: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.caption,
    color: colors.dark.textMuted,
    marginTop: 2,
    maxWidth: '92%',
    textAlign: 'center',
  },
});
