import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PulseIconButton } from '@/components/ui/pulse/PulseIconButton';
import { FEED_TABS } from '@/constants';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { FeedType } from '@/types';

type Props = {
  insetTop: number;
  activeTab: FeedType;
  onTabChange: (tab: FeedType) => void;
  onSearch: () => void;
  /** When active lives exist — subtle chrome indicator (Phase 4). */
  showLiveNowIndicator?: boolean;
  onLiveNowPress?: () => void;
};

/** Lightweight glass tab bar over the feed video canvas. */
export function FeedTopChrome({
  insetTop,
  activeTab,
  onTabChange,
  onSearch,
  showLiveNowIndicator = false,
  onLiveNowPress,
}: Props) {
  return (
    <View style={[styles.host, { paddingTop: insetTop + pulseSpacing.xs }]} pointerEvents="box-none">
      <LinearGradient
        colors={['rgba(25, 211, 197, 0.06)', 'rgba(139, 92, 246, 0.04)', 'transparent']}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          {showLiveNowIndicator && onLiveNowPress ? (
            <Pressable
              style={styles.liveNowPill}
              onPress={onLiveNowPress}
              accessibilityRole="button"
              accessibilityLabel="Live now — show happening now streams"
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveNowText}>Live</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.tabRow}>
          {FEED_TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabItem}
                onPress={() => onTabChange(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
                {active ? <View style={styles.tabGlow} /> : <View style={styles.tabGlowSpacer} />}
              </Pressable>
            );
          })}
        </View>
        <PulseIconButton
          icon="search-outline"
          onPress={onSearch}
          accessibilityLabel="Search"
          size="sm"
          tone="ghost"
          style={styles.searchBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingBottom: pulseSpacing.sm,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    height: 112,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: pulseSpacing.sm,
  },
  sideSlot: {
    width: 52,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  liveNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: pulseColors.glass,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: pulseColors.live,
  },
  liveNowText: {
    ...pulseTypography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: pulseColors.text,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: pulseSpacing.xs,
    minWidth: 0,
    paddingHorizontal: pulseSpacing.xs,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: pulseSpacing.xs,
    paddingBottom: 2,
  },
  tabLabel: {
    ...pulseTypography.caption,
    fontSize: 14,
    fontWeight: '700',
    color: pulseColors.textQuiet,
    textAlign: 'center',
    ...Platform.select({
      default: {
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  tabLabelActive: {
    color: pulseColors.text,
    fontWeight: '800',
  },
  tabGlow: {
    marginTop: 6,
    height: 2,
    width: 26,
    borderRadius: 1,
    backgroundColor: pulseColors.teal,
    shadowColor: pulseColors.teal,
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  tabGlowSpacer: {
    marginTop: 6,
    height: 2,
    width: 26,
  },
  searchBtn: {
    backgroundColor: pulseColors.glass,
    borderColor: pulseColors.border,
  },
});
