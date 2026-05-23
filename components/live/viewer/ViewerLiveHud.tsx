import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import { formatCount } from '@/utils/format';

type Props = {
  liveLabel: string;
  viewerCount: number;
  audioMuted: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleAudio: () => void;
  onMore?: () => void;
  showMore?: boolean;
};

export function ViewerLiveHud({
  liveLabel,
  viewerCount,
  audioMuted,
  onBack,
  onShare,
  onToggleAudio,
  onMore,
  showMore,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} style={styles.iconBtn} accessibilityLabel="Close live">
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{liveLabel}</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Ionicons name="eye-outline" size={12} color={colors.dark.textSecondary} />
          <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onToggleAudio} style={styles.iconBtn} accessibilityLabel={audioMuted ? 'Unmute audio' : 'Mute audio'}>
          <Ionicons
            name={audioMuted ? 'volume-mute' : 'volume-high'}
            size={18}
            color={audioMuted ? colors.primary.gold : '#FFF'}
          />
        </Pressable>
        <Pressable onPress={onShare} style={styles.iconBtn} accessibilityLabel="Share">
          <Ionicons name="share-social-outline" size={17} color="#FFF" />
        </Pressable>
        {showMore && onMore ? (
          <Pressable onPress={onMore} style={styles.iconBtn} accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={18} color="#FFF" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 30,
  },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.88)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,28,48,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  viewerText: { fontSize: 11, fontWeight: '700', color: colors.dark.text },
});
