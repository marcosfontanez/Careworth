import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import * as Haptics from 'expo-haptics';

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
  light?: boolean;
}

export function TopSegmentTabs({ tabs, activeKey, onSelect, light = false }: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(tab.key);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                light && styles.lightLabel,
                active && styles.activeLabel,
                active && light && styles.activeLightLabel,
              ]}
            >
              {tab.label}
            </Text>
            {active && <View style={[styles.indicator, light && styles.lightIndicator]} />}
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
    gap: 6,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.midGray,
    letterSpacing: -0.1,
  },
  lightLabel: {
    color: 'rgba(255,255,255,0.55)',
  },
  activeLabel: {
    color: colors.neutral.darkText,
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
    backgroundColor: colors.primary.teal,
    marginTop: 5,
  },
  lightIndicator: {
    backgroundColor: colors.dark.text,
  },
});
