import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  /**
   * Either an emoji ("🔍") or an Ionicons name ("notifications-off-outline").
   * If string contains only word chars / dashes it's treated as an icon name.
   */
  icon: string;
  title: string;
  subtitle?: string;
  /** Tints the icon halo. Defaults to teal. */
  accent?: string;
  /** Optional CTA button under the subtitle. */
  ctaLabel?: string;
  onCtaPress?: () => void;
};

const ICON_NAME_RE = /^[a-z0-9-]+$/i;

/**
 * Centered empty placeholder for lists and tabs.
 * Accent-tinted icon halo gives every screen a consistent, premium empty state
 * instead of a lonely emoji on a black background.
 */
export function EmptyState({ icon, title, subtitle, accent, ctaLabel, onCtaPress }: Props) {
  const accentColor = accent ?? colors.primary.teal;
  const isIconName = ICON_NAME_RE.test(icon);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.halo,
          { backgroundColor: accentColor + '14', borderColor: accentColor + '22' },
        ]}
      >
        {isIconName ? (
          <Ionicons name={icon as IonName} size={32} color={accentColor} />
        ) : (
          <Text style={styles.emoji}>{icon}</Text>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          onPress={onCtaPress}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: accentColor }, shadows.cta]}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    paddingHorizontal: spacing.xl + spacing.lg,
  },
  halo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  emoji: { fontSize: 36 },
  title: {
    ...typography.h3,
    fontSize: 17,
    color: colors.dark.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 280,
  },
  cta: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
  },
  ctaText: {
    ...typography.button,
    color: colors.dark.text,
    fontWeight: '700',
  },
});
