import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import { LivePill } from './LivePill';
import { LiveViewerBadge } from './LiveViewerBadge';
import type { LiveStream } from '@/types';

type Props = {
  stream: LiveStream;
  onPress: () => void;
  onMore?: () => void;
  /** Optional override for the small theme/category chip text */
  categoryLabel?: string;
};

const CARD_WIDTH = 220;
const THUMB_HEIGHT = 130;

/**
 * Medium-sized card for the "Top Live Now" horizontal row.
 * Premium thumbnail with LIVE pill + viewers, then title, host meta,
 * and an optional small category chip + overflow icon.
 */
export function LiveNowCard({ stream, onPress, onMore, categoryLabel }: Props) {
  const cat = categoryLabel ?? stream.category;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Open live: ${stream.title}`}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: stream.thumbnailUrl }} style={styles.img} contentFit="cover" />
        <LinearGradient
          colors={['rgba(6,14,26,0)', 'rgba(6,14,26,0.7)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlayTop}>
          <LivePill size="sm" />
          <LiveViewerBadge count={stream.viewerCount} size="sm" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {stream.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {stream.host.displayName}
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaSpec}>{stream.host.specialty}</Text>
        </Text>

        <View style={styles.footRow}>
          {cat ? (
            <View style={styles.catChip}>
              <Text style={styles.catChipText} numberOfLines={1}>
                {capitalize(String(cat))}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {onMore ? (
            <TouchableOpacity
              onPress={onMore}
              hitSlop={8}
              accessibilityLabel="More options"
              style={styles.moreBtn}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  thumbWrap: {
    height: THUMB_HEIGHT,
    backgroundColor: colors.dark.cardAlt,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  overlayTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
  },
  title: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  metaDot: { color: colors.dark.textQuiet },
  metaSpec: { color: colors.dark.textSecondary },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal + '18',
    borderWidth: 1,
    borderColor: colors.primary.teal + '32',
    maxWidth: '80%',
  },
  catChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary.teal,
    letterSpacing: 0.2,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
