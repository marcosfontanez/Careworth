import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, pulseverse, semantic } from '@/theme';
import * as Haptics from 'expo-haptics';

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
  /**
   * `dark` — default in-app (navy backgrounds).
   * `onLight` — inactive grays / black active (legacy marketing-style row).
   */
  appearance?: 'dark' | 'onLight';
}

export function TopSegmentTabs({ tabs, activeKey, onSelect, appearance = 'dark' }: Props) {
  const dark = appearance === 'dark';
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(tab.key);
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.label,
                dark ? styles.labelDarkInactive : styles.lightLabel,
                active && (dark ? styles.activeLabelDark : styles.activeLabel),
                active && !dark && styles.activeLightLabel,
              ]}
            >
              {tab.label}
            </Text>
            {active && (
              <View style={[styles.indicator, dark ? styles.indicatorDark : styles.lightIndicator]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  labelDarkInactive: {
    color: semantic.textMuted,
  },
  lightLabel: {
    color: 'rgba(255,255,255,0.55)',
  },
  activeLabel: {
    color: colors.neutral.darkText,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  activeLabelDark: {
    color: semantic.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  activeLightLabel: {
    color: colors.dark.text,
  },
  indicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginTop: 5,
  },
  indicatorDark: {
    backgroundColor: pulseverse.electric,
  },
  lightIndicator: {
    backgroundColor: colors.primary.teal,
  },
});
