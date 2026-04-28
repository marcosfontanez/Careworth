import React, { useCallback, useRef, useState } from 'react';
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
import { FeaturedLiveCard } from './FeaturedLiveCard';
import type { LiveStream } from '@/types';

type Props = {
  streams: LiveStream[];
  onPressStream: (stream: LiveStream) => void;
  /** Cap how many hero cards to show. Defaults to 5 (per design spec). */
  maxCards?: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Hero card width = screen minus standard horizontal padding on both sides */
const SIDE_PADDING = layout.screenPadding;
const CARD_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + spacing.md;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export function FeaturedLiveCarousel({
  streams,
  onPressStream,
  maxCards = 5,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<LiveStream>>(null);

  const data = streams.slice(0, maxCards);

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
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH, marginRight: spacing.md }}>
            <FeaturedLiveCard
              stream={item}
              width={CARD_WIDTH}
              onPress={() => onPressStream(item)}
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

      {data.length > 1 ? (
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
