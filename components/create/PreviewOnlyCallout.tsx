import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
  /** Short headline, e.g. "Preview only" */
  title: string;
  /** One or two sentences — what ships vs what stays on-device. */
  body: string;
}

/**
 * Phase A “truth in UI”: surfaces that composer polish does not necessarily match the uploaded artifact.
 */
export function PreviewOnlyCallout({ title, body }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.iconCircle}>
        <Ionicons name="eye-outline" size={15} color={colors.primary.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.dark.textMuted,
    fontWeight: '500',
  },
});
