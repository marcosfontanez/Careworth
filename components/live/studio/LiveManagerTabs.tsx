import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  pulseColors,
  pulseGradients,
  pulseRadius,
  pulseSpacing,
  pulseTypography,
} from '@/lib/theme/pulseTheme';
import type { StreamManagerTab } from '@/components/live/studio/StreamManagerPanel';

const TABS: {
  id: StreamManagerTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  { id: 'actions', label: 'Quick', icon: 'flash-outline' },
  { id: 'polls', label: 'Polls', icon: 'stats-chart-outline' },
  { id: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { id: 'qna', label: 'Q&A', icon: 'help-circle-outline' },
  { id: 'markers', label: 'Clips', icon: 'bookmark-outline' },
  { id: 'mod', label: 'Mod', icon: 'shield-checkmark-outline' },
  { id: 'health', label: 'Health', icon: 'pulse-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

type Props = {
  activeTab: StreamManagerTab;
  onTabChange: (tab: StreamManagerTab) => void;
};

/** Premium horizontal tab strip for Live Studio panels — pulseTheme styling. */
export function LiveManagerTabs({ activeTab, onTabChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {TABS.map((tab) => {
        const on = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={({ pressed }) => [styles.tabOuter, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            {on ? (
              <LinearGradient
                colors={[...pulseGradients.primaryCta]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabOn}
              >
                <Ionicons name={tab.icon} size={15} color={pulseColors.onAccent} />
                <Text style={styles.tabTxtOn}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabOff}>
                <Ionicons name={tab.icon} size={15} color={pulseColors.mutedText} />
                <Text style={styles.tabTxtOff}>{tab.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: pulseSpacing.sm, paddingBottom: pulseSpacing.md },
  tabOuter: { borderRadius: pulseRadius.full },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tabOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: pulseSpacing.lg,
    paddingVertical: 10,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  tabOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: pulseSpacing.lg,
    paddingVertical: 10,
    borderRadius: pulseRadius.full,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  tabTxtOn: {
    ...pulseTypography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: pulseColors.onAccent,
  },
  tabTxtOff: {
    ...pulseTypography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: pulseColors.mutedText,
  },
});
