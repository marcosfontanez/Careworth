import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, pulseverse, pvKit, spacing, borderRadius } from '@/theme';

export type PVSegmentItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

export type PVSegmentedTabsProps<T extends string = string> = {
  items: PVSegmentItem<T>[];
  selected: T;
  onSelect: (key: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** `inset` = segments inside one track. `twin` = equal standalone pills in a row (e.g. Circles). `scroll` = chip row. */
  variant?: 'scroll' | 'inset' | 'twin';
  /**
   * Inset / twin: outer row width in px (screen − horizontal gutters). Fixes RN Web where `%`/flex
   * widths collapse inside ScrollViews; twin pills split this width 50/50.
   */
  trackWidth?: number;
};

const SEG = pvKit.segmented;

function activeBloom() {
  return Platform.select({
    ios: {
      shadowColor: pulseverse.electric,
      shadowOpacity: 0.42,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
    default: {},
  });
}

/**
 * Segmented control — optional inset track, twin equal pills, or horizontal scroll chips.
 */
export function PVSegmentedTabs<T extends string>({
  items,
  selected,
  onSelect,
  style,
  testID,
  variant = 'scroll',
  trackWidth,
}: PVSegmentedTabsProps<T>) {
  if (variant === 'twin') {
    const rowDims =
      trackWidth != null && trackWidth > 0
        ? { width: trackWidth, maxWidth: trackWidth, alignSelf: 'center' as const }
        : null;
    return (
      <View style={[styles.twinRow, rowDims, style]} testID={testID}>
        {items.map((item, index) => {
          const active = item.key === selected;
          return (
            <View
              key={item.key}
              style={[styles.twinCell, index < items.length - 1 ? styles.twinCellGap : null]}
            >
              <Pressable
                onPress={() => onSelect(item.key)}
                style={({ pressed }) => [styles.twinPressable, pressed && styles.pressedTrack]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                {active ? (
                  <LinearGradient
                    colors={[SEG.activeFillTop, SEG.activeFillBottom]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[
                      styles.twinPillSurface,
                      styles.pillOn,
                      { borderColor: SEG.activeBorder },
                      activeBloom(),
                    ]}
                  >
                    {item.icon ? (
                      <Ionicons name={item.icon} size={18} color={pulseverse.electricSoft} style={styles.iconGap} />
                    ) : null}
                    <Text style={[styles.label, styles.labelOn, styles.twinLabel]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.twinPillSurface,
                      { borderColor: SEG.inactiveBorder, backgroundColor: SEG.idleFill },
                    ]}
                  >
                    {item.icon ? (
                      <Ionicons name={item.icon} size={18} color={colors.dark.textMuted} style={styles.iconGap} />
                    ) : null}
                    <Text style={[styles.label, styles.twinLabel]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  }

  if (variant === 'inset') {
    const trackDims =
      trackWidth != null && trackWidth > 0
        ? { width: trackWidth, maxWidth: trackWidth, alignSelf: 'center' as const }
        : null;
    return (
      <View
        style={[
          styles.track,
          trackDims,
          {
            backgroundColor: SEG.insetBg,
            borderColor: SEG.insetBorder,
            borderRadius: SEG.insetRadius,
            padding: SEG.insetPadding,
          },
          style,
        ]}
        testID={testID}
      >
        {items.map((item, index) => {
          const active = item.key === selected;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.insetFlex,
                index < items.length - 1 ? styles.insetSegmentGap : null,
                pressed && styles.pressedTrack,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              {active ? (
                <LinearGradient
                  colors={[SEG.activeFillTop, SEG.activeFillBottom]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[styles.insetPill, styles.insetPillOn, { borderColor: SEG.activeBorder }, activeBloom()]}
                >
                  {item.icon ? (
                    <Ionicons name={item.icon} size={20} color={pulseverse.electricSoft} />
                  ) : null}
                  <Text style={styles.insetLabelOn} numberOfLines={1}>
                    {item.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.insetPill, { borderColor: SEG.inactiveBorder, backgroundColor: SEG.idleFill }]}>
                  {item.icon ? (
                    <Ionicons name={item.icon} size={20} color={colors.dark.textMuted} />
                  ) : null}
                  <Text style={styles.insetLabelOff} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
      testID={testID}
    >
      {items.map((item) => {
        const active = item.key === selected;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [pressed && styles.pressedTrack]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {active ? (
              <LinearGradient
                colors={[SEG.activeFillTop, SEG.activeFillBottom]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[
                  styles.pill,
                  styles.pillOn,
                  { borderColor: SEG.activeBorder },
                  activeBloom(),
                ]}
              >
                {item.icon ? (
                  <Ionicons name={item.icon} size={17} color={pulseverse.electricSoft} style={styles.iconGap} />
                ) : null}
                <Text style={[styles.label, styles.labelOn]} numberOfLines={1}>
                  {item.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pill, { borderColor: SEG.inactiveBorder, backgroundColor: SEG.idleFill }]}>
                {item.icon ? (
                  <Ionicons name={item.icon} size={17} color={colors.dark.textMuted} style={styles.iconGap} />
                ) : null}
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  /** Prefer margin over `gap` — flex `gap` + equal columns is unreliable on RN Web. */
  insetSegmentGap: { marginRight: 4 },
  insetFlex: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  insetPill: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
    borderWidth: 1,
  },
  insetPillOn: { overflow: 'hidden' },
  insetLabelOn: {
    fontSize: 16,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    letterSpacing: -0.15,
  },
  insetLabelOff: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: -0.1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  /** Equal split row — no outer track; each tab is its own pill. */
  twinRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    alignSelf: 'stretch',
  },
  twinCell: {
    flex: 1,
    minWidth: 0,
  },
  twinCellGap: { marginRight: spacing.sm },
  twinPressable: {
    flex: 1,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  twinPillSurface: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: SEG.pillPadV + 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  twinLabel: {
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: SEG.pillPadH + 4,
    paddingVertical: SEG.pillPadV + 4,
  },
  pillOn: { overflow: 'hidden' },
  iconGap: { marginRight: 2 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: colors.dark.textMuted,
  },
  labelOn: {
    color: pulseverse.electricSoft,
    fontWeight: '800',
  },
  pressedTrack: { opacity: 0.92 },
});
