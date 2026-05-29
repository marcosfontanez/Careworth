import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

export type PulseTabItem = {
  id: string;
  label: string;
  badge?: number;
};

type Props = {
  tabs: PulseTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

/** Segmented tabs with active teal accent and inactive glass pills. */
export function PulseTabs({ tabs, activeId, onChange, style, scrollable = false }: Props) {
  const row = (
    <View style={[styles.row, style]}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{tab.label}</Text>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {row}
      </ScrollView>
    );
  }

  return row;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: pulseSpacing.lg },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pulseSpacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: 'rgba(25, 211, 197, 0.14)',
    borderColor: pulseColors.borderAccent,
  },
  tabInactive: {
    backgroundColor: pulseColors.glass,
    borderColor: pulseColors.border,
  },
  label: { ...pulseTypography.caption, fontWeight: '800' },
  labelActive: { color: pulseColors.teal },
  labelInactive: { color: pulseColors.mutedText },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.live,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: pulseColors.text },
});
