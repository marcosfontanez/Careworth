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
  /** When true, shows the small trending-up "rising" indicator pill on the thumbnail. */
  showRisingIndicator?: boolean;
};

const CARD_WIDTH = 168;
const THUMB_HEIGHT = 96;

/**
 * Compact card for the "Rising Lives" row.
 * Smaller than LiveNowCard, with a subtle "rising" indicator to suggest momentum.
 */
export function RisingLiveCard({ stream, onPress, showRisingIndicator = true }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Open rising live: ${stream.title}`}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: stream.thumbnailUrl }} style={styles.img} contentFit="cover" />
        <LinearGradient
          colors={['rgba(6,14,26,0)', 'rgba(6,14,26,0.7)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlayTop}>
          <LivePill size="sm" />
          <LiveViewerBadge count={stream.viewerCount} size="sm" />
        </View>
        {showRisingIndicator ? (
          <View style={styles.risingPill}>
            <Ionicons name="trending-up" size={10} color={colors.primary.gold} />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {stream.title}
        </Text>
        <Text style={styles.host} numberOfLines={1}>
          {stream.host.displayName}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {stream.host.role}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg + 2,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  thumbWrap: {
    height: THUMB_HEIGHT,
    backgroundColor: colors.dark.cardAlt,
  },
  img: { width: '100%', height: '100%' },
  overlayTop: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  risingPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.primary.gold + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
  },
  title: {
    ...typography.subtitle,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  host: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    marginTop: 2,
  },
  role: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginTop: 1,
  },
});
