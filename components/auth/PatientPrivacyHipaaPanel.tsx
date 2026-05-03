import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '@/theme';
import { HIPAA_ENFORCEMENT_SUMMARY } from '@/constants/authLegal';

/**
 * High-visibility callout for sign-up and legal-ack flows — HIPAA, PHI, and enforcement.
 */
export function PatientPrivacyHipaaPanel() {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={22} color={colors.primary.gold} />
        <Text style={styles.bannerTitle}>Patient privacy and HIPAA</Text>
      </View>
      <Text style={styles.lede}>
        We take violations of patient privacy seriously — including under HIPAA and similar rules when they apply.
      </Text>
      <Text style={styles.body}>{HIPAA_ENFORCEMENT_SUMMARY}</Text>
      <View style={styles.bullets}>
        <Text style={styles.bullet}>• Never post identifiable patient information, photos of patients, or charts.</Text>
        <Text style={styles.bullet}>• Use the platform for professional community and education — not to share PHI.</Text>
        <Text style={styles.bullet}>• Violations can mean immediate account termination and referral to authorities when warranted.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.primary.gold + 'AA',
    backgroundColor: colors.primary.gold + '14',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bannerTitle: {
    ...typography.h4,
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary.gold,
    letterSpacing: -0.3,
  },
  lede: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.dark.text,
    lineHeight: 22,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 22,
  },
  bullets: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary.gold + '55',
  },
  bullet: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 20,
    fontWeight: '600',
  },
});
