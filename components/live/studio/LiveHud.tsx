import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  liveLabel: string;
  sessionTimer: string;
  viewerCountLabel: string;
  onBack?: () => void;
  onOpenManager?: () => void;
  onShare?: () => void;
  showShare?: boolean;
  showManager?: boolean;
  topInset?: number;
};

/** Minimal top HUD — keeps the live stage visually dominant. */
export function LiveHud({
  liveLabel,
  sessionTimer,
  viewerCountLabel,
  onBack,
  onOpenManager,
  onShare,
  showShare = false,
  showManager = false,
  topInset = 0,
}: Props) {
  return (
    <View style={[styles.wrap, { paddingTop: topInset }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
        ) : (
          <View style={styles.iconSpacer} />
        )}

        <View style={styles.center}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{liveLabel}</Text>
          </View>
          {sessionTimer ? (
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={12} color={colors.dark.textSecondary} />
              <Text style={styles.timerText}>{sessionTimer}</Text>
            </View>
          ) : null}
          <View style={styles.viewerBadge}>
            <Ionicons name="eye-outline" size={13} color={colors.dark.textSecondary} />
            <Text style={styles.viewerText}>{viewerCountLabel}</Text>
          </View>
        </View>

        <View style={styles.right}>
          {showShare && onShare ? (
            <Pressable onPress={onShare} style={styles.iconBtnSubtle} accessibilityLabel="Share">
              <Ionicons name="share-social-outline" size={17} color="#FFF" />
            </Pressable>
          ) : null}
          {showManager && onOpenManager ? (
            <Pressable
              onPress={onOpenManager}
              style={styles.managerBtn}
              accessibilityLabel="Open Stream Manager"
            >
              <Ionicons name="grid-outline" size={18} color={colors.primary.teal} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconSpacer: { width: 40 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBtnSubtle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 40, justifyContent: 'flex-end' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.status.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  liveText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,28,48,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  timerText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,28,48,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  viewerText: { fontSize: 12, fontWeight: '700', color: colors.dark.text },
});
