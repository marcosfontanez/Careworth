import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PUBLIC_QUESTION_GUARDRAIL } from '@/lib/onboarding/constants';
import { borderRadius, pulseverse } from '@/theme';

/** Shown in public Q&A Circles for learners, caregivers, and general education paths. */
export function PublicHealthGuardrailBanner() {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Ionicons name="shield-checkmark-outline" size={18} color={pulseverse.accentCyan} />
      <Text style={styles.text}>{PUBLIC_QUESTION_GUARDRAIL}</Text>
    </View>
  );
}

const GUARDRAIL_SLUGS = new Set(['simple-medical-questions']);

export function shouldShowPublicHealthGuardrail(slug: string | undefined): boolean {
  if (!slug) return false;
  return GUARDRAIL_SLUGS.has(slug.trim().toLowerCase());
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, color: '#CBD5E1', fontWeight: '600' },
});
