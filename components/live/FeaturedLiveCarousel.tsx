import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  type ViewToken,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { layout, spacing, colors } from '@/theme';
import {
  FeaturedLiveCard,
  FEATURED_LIVE_COMPACT_HEIGHT,
  FEATURED_LIVE_HERO_HEIGHT,
} from './FeaturedLiveCard';
import type { LiveStream } from '@/types';
import { getFeaturedLiveHeroCarouselWindow } from '@/lib/feedVideoListWindow';

const FEATURED_LIVE_CAROUSEL_WINDOW = getFeaturedLiveHeroCarouselWindow();

type Props = {
  streams: LiveStream[];
  onPressStream: (stream: LiveStream) => void;
  /** Cap how many hero cards to show. Defaults to 5 (per design spec). */
  maxCards?: number;
  /** Category pill (Learn, Circle Live, …). */
  getCategoryLabel?: (stream: LiveStream) => string | undefined;
  /** Optional second line under title (e.g. hub mode + promo tag). */
  getSubtitle?: (stream: LiveStream) => string | undefined;
  /** Shop Live / commerce pill under LIVE badge on hero cards. */
  getShopBadge?: (stream: LiveStream) => string | undefined;
  /** Shorter hero cards for hub layouts closer to compact marketing mocks. */
  variant?: 'hero' | 'compact';
};

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Hero card width = screen minus standard horizontal padding on both sides */
const SIDE_PADDING = layout.screenPadding;
const CARD_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + spacing.md;
const CARD_HEIGHTS = { hero: FEATURED_LIVE_HERO_HEIGHT, compact: FEATURED_LIVE_COMPACT_HEIGHT } as const;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export function FeaturedLiveCarousel({
  streams,
  onPressStream,
  maxCards = 5,
  getCategoryLabel,
  getSubtitle,
  getShopBadge,
  variant = 'hero',
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<LiveStream>>(null);

  const data = useMemo(() => {
    const seen = new Set<string>();
    const unique: LiveStream[] = [];
    for (const stream of streams) {
      if (seen.has(stream.id)) continue;
      seen.add(stream.id);
      unique.push(stream);
      if (unique.length >= maxCards) break;
    }
    return unique;
  }, [streams, maxCards]);
  const cardHeight = CARD_HEIGHTS[variant];
  const showDots = data.length > 1;
  const carouselHeight = cardHeight + (showDots ? spacing.md + 6 : 0);

  useEffect(() => {
    if (activeIndex >= data.length) {
      setActiveIndex(Math.max(0, data.length - 1));
    }
  }, [activeIndex, data.length]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
        setActiveIndex(viewableItems[0].index!);
      }
    },
  ).current;

  /** Fallback for platforms where viewability is flaky — derive from offset */
  const onScrollFallback = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
      if (idx !== activeIndex && idx >= 0 && idx < data.length) {
        setActiveIndex(idx);
      }
    },
    [activeIndex, data.length],
  );

  if (data.length === 0) return null;

  return (
    <View style={[styles.wrap, { minHeight: carouselHeight }]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        nestedScrollEnabled
        style={{ height: cardHeight }}
        initialNumToRender={FEATURED_LIVE_CAROUSEL_WINDOW.initialNumToRender}
        maxToRenderPerBatch={FEATURED_LIVE_CAROUSEL_WINDOW.maxToRenderPerBatch}
        windowSize={FEATURED_LIVE_CAROUSEL_WINDOW.windowSize}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH, height: cardHeight, marginRight: spacing.md }}>
            <FeaturedLiveCard
              stream={item}
              width={CARD_WIDTH}
              onPress={() => onPressStream(item)}
              categoryLabel={getCategoryLabel?.(item)}
              subtitle={getSubtitle?.(item)}
              shopBadge={getShopBadge?.(item)}
              variant={variant}
            />
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scroll}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
        onMomentumScrollEnd={onScrollFallback}
        getItemLayout={(_, i) => ({
          length: SNAP_INTERVAL,
          offset: SNAP_INTERVAL * i,
          index: i,
        })}
      />

      {showDots ? (
        <View style={styles.dots}>
          {data.map((s, i) => {
            const active = i === activeIndex;
            return (
              <View
                key={s.id}
                style={[styles.dot, active && styles.dotActive]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  scroll: {
    paddingLeft: SIDE_PADDING,
    /** trailing padding so last card snaps cleanly without trailing gap */
    paddingRight: SIDE_PADDING - spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary.teal,
  },
});
