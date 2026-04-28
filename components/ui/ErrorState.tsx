import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';

interface Props {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  icon?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  subtitle = 'Please try again or check your connection',
  onRetry,
  icon = 'alert-circle-outline',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.halo}>
        <Ionicons name={icon as any} size={32} color={colors.status.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, shadows.cta]}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color={colors.dark.text} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.sm + spacing.xs,
    backgroundColor: colors.dark.bg,
  },
  halo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.error + '14',
    borderWidth: 1,
    borderColor: colors.status.error + '22',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3, fontSize: 18, color: colors.dark.text, textAlign: 'center' },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    marginTop: spacing.md,
  },
  retryText: { ...typography.button, fontWeight: '700', color: colors.dark.text },
});
