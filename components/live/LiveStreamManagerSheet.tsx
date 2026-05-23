import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveBottomSheet } from '@/components/live/LiveBottomSheet';
import { colors, borderRadius, typography } from '@/theme';

export type StreamManagerTab =
  | 'chat'
  | 'actions'
  | 'polls'
  | 'gifts'
  | 'mod'
  | 'settings';

const TABS: { id: StreamManagerTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  { id: 'actions', label: 'Actions', icon: 'flash-outline' },
  { id: 'polls', label: 'Polls', icon: 'stats-chart-outline' },
  { id: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { id: 'mod', label: 'Mod', icon: 'shield-checkmark-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  preview?: React.ReactNode;
  panels: Partial<Record<StreamManagerTab, React.ReactNode>>;
  initialTab?: StreamManagerTab;
};

/** Host Stream Manager — video preview + tabbed panels below the live stage. */
export function LiveStreamManagerSheet({
  visible,
  onClose,
  preview,
  panels,
  initialTab = 'chat',
}: Props) {
  const [tab, setTab] = useState<StreamManagerTab>(initialTab);

  return (
    <LiveBottomSheet visible={visible} onClose={onClose} title="Stream Manager" maxHeightRatio={0.88}>
      {preview ? <View style={styles.preview}>{preview}</View> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          const hasPanel = Boolean(panels[t.id]);
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, on && styles.tabOn, !hasPanel && styles.tabMuted]}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              disabled={!hasPanel}
            >
              <Ionicons name={t.icon} size={14} color={on ? '#0F172A' : colors.dark.textSecondary} />
              <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>{panels[tab] ?? null}</View>
    </LiveBottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 140,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  tabRow: { gap: 8, paddingBottom: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabOn: {
    backgroundColor: colors.primary.teal,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  tabMuted: { opacity: 0.45 },
  tabTxt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
  tabTxtOn: { color: '#0F172A' },
  panel: {
    minHeight: 220,
    maxHeight: 420,
  },
});
