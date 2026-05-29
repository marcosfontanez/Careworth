import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFeedClipCompactBadgeLabel } from '@/lib/feedClipAttribution';
import type { Post } from '@/types';
import { pulseColors, pulseTypography } from '@/lib/theme/pulseTheme';

type Props = {
  post: Pick<Post, 'sourcePostId' | 'sourceLiveStreamId' | 'caption'>;
};

/** Small corner badge for grids — no network fetch. */
export function FeedClipAttributionBadge({ post }: Props) {
  const label = getFeedClipCompactBadgeLabel(post);
  if (!label) return null;

  const isLive = Boolean(post.sourceLiveStreamId?.trim());

  return (
    <View style={styles.badge} pointerEvents="none" accessibilityLabel={label}>
      <Ionicons
        name={isLive ? 'radio-outline' : 'cut-outline'}
        size={9}
        color={isLive ? pulseColors.live : pulseColors.teal}
      />
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '78%',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(6,10,20,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  text: {
    ...pulseTypography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    flexShrink: 1,
  },
});
