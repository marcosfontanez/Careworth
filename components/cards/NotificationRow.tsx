import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { avatarThumb } from '@/lib/storage';
import type { NotificationItem } from '@/types';

const typeConfig: Record<string, { name: string; color: string; bg: string; action?: string }> = {
  new_follower: { name: 'person-add', color: colors.primary.royal, bg: colors.primary.royal + '18', action: 'Follow Back' },
  like: { name: 'heart', color: colors.status.error, bg: colors.status.error + '18', action: 'View' },
  save: { name: 'bookmark', color: colors.primary.gold, bg: colors.primary.gold + '18', action: 'View' },
  share: { name: 'paper-plane', color: colors.primary.royal, bg: colors.primary.royal + '18', action: 'View' },
  comment: { name: 'chatbubble', color: colors.primary.teal, bg: colors.primary.teal + '18', action: 'Reply' },
  reply: { name: 'chatbubble-ellipses', color: colors.primary.teal, bg: colors.primary.teal + '18', action: 'Reply' },
  mention: { name: 'at', color: colors.primary.teal, bg: colors.primary.teal + '22', action: 'View' },
  community_invite: { name: 'people', color: colors.status.invite, bg: colors.status.invite + '18', action: 'Join' },
  job_alert: { name: 'briefcase', color: colors.primary.gold, bg: colors.primary.gold + '18' },
  badge_earned: { name: 'ribbon', color: colors.primary.gold, bg: colors.primary.gold + '18' },
  tier_up: { name: 'pulse', color: '#F59E0B', bg: 'rgba(245,158,11,0.18)', action: 'View' },
};

interface Props {
  notification: NotificationItem;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: Props) {
  const cfg = typeConfig[notification.type] ?? { name: 'notifications', color: colors.dark.textMuted, bg: colors.dark.card };

  return (
    <TouchableOpacity
      style={[styles.row, !notification.read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatarThumb(notification.actor.avatarUrl, 48) }} style={styles.avatar} />
        <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
          <Ionicons name={cfg.name as any} size={10} color={colors.dark.text} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{timeAgo(notification.createdAt)}</Text>
          {cfg.action && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: cfg.bg, borderColor: cfg.color + '38' }]}
              onPress={onPress}
              activeOpacity={0.75}
            >
              <Text style={[styles.actionText, { color: cfg.color }]}>{cfg.action}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!notification.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  unread: { backgroundColor: colors.primary.teal + '0A' },
  avatarWrap: { position: 'relative', marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.dark.border },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: colors.dark.bg,
  },
  body: { flex: 1 },
  message: { ...typography.body, fontSize: 14, color: colors.dark.text, lineHeight: 20, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs + 2, gap: spacing.sm + 2 },
  time: { ...typography.caption, color: colors.dark.textMuted },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.md - 2,
    borderWidth: 1,
  },
  actionText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.teal, marginTop: spacing.xs + 2 },
});
