import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
  tone?: 'default' | 'error' | 'muted';
};

/** Full-screen viewer states — ended, unavailable, blocked, etc. */
export function ViewerLiveStateScreen({
  title,
  message,
  icon = 'radio-outline',
  actionLabel,
  onAction,
  onBack,
  tone = 'default',
}: Props) {
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
      ) : null}
      <View style={styles.center}>
        <View style={[styles.iconRing, tone === 'error' && styles.iconRingError]}>
          <Ionicons
            name={icon}
            size={32}
            color={tone === 'error' ? colors.status.error : colors.primary.teal}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.actionBtn}>
            <Text style={styles.actionTxt}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 20,
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
    marginTop: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
    gap: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
    marginBottom: 8,
  },
  iconRingError: { borderColor: 'rgba(252,165,165,0.35)' },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: colors.neutral.white,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
  },
  actionTxt: { ...typography.button, fontWeight: '800', color: colors.dark.bg },
});
