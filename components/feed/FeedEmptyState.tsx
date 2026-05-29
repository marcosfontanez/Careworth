import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PulseEmptyState } from '@/components/ui/pulse/PulseEmptyState';
import { pulseColors } from '@/lib/theme/pulseTheme';
import type { FeedType } from '@/types';

type Props = {
  height: number;
  tab: FeedType;
  onExplore?: () => void;
};

const COPY: Partial<
  Record<
    FeedType,
    { icon: React.ComponentProps<typeof PulseEmptyState>['icon']; title: string; message: string; cta?: string }
  >
> = {
  forYou: {
    icon: 'pulse-outline',
    title: 'Your Pulse is warming up',
    message: 'Follow creators, join Circles, or post your first video.',
    cta: 'Explore',
  },
  following: {
    icon: 'people-outline',
    title: 'Build your Feed',
    message: 'Follow healthcare creators to see their latest clips here.',
    cta: 'Find creators',
  },
  topToday: {
    icon: 'trending-up-outline',
    title: 'No trending videos yet',
    message: 'Be the first to start today\u2019s Pulse.',
  },
};

/** Full-viewport empty state over the feed video canvas — tab-aware PulseVerse copy. */
export function FeedEmptyState({ height, tab, onExplore }: Props) {
  const copy = COPY[tab] ?? COPY.forYou!;

  return (
    <View style={[styles.wrap, { height }]}>
      <PulseEmptyState
        icon={copy.icon}
        title={copy.title}
        message={copy.message}
        actionLabel={copy.cta && onExplore ? copy.cta : undefined}
        onAction={copy.cta && onExplore ? onExplore : undefined}
        style={styles.inner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: pulseColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    paddingVertical: 0,
  },
});
