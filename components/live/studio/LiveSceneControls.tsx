import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import {
  LIVE_SCENE_MODES_BASE,
  liveSceneLabel,
  sceneStatusChipIcon,
  type LiveSceneMode,
} from '@/lib/live/liveSceneMode';

type Props = {
  activeMode: LiveSceneMode;
  onSelect: (mode: LiveSceneMode) => void;
  disabled?: boolean;
  loading?: boolean;
  hasActivePoll?: boolean;
};

/** Host scene mode selector — updates preview + viewer overlay without ending room. */
export function LiveSceneControls({ activeMode, onSelect, disabled, loading, hasActivePoll }: Props) {
  const modes = useMemo(() => {
    const list: LiveSceneMode[] = [...LIVE_SCENE_MODES_BASE];
    if (hasActivePoll) list.push('poll');
    return list;
  }, [hasActivePoll]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Scene mode</Text>
      <Text style={styles.meta}>Switch presentation without ending your LiveKit room or chat.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {modes.map((mode) => {
          const on = activeMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => onSelect(mode)}
              disabled={disabled || loading}
              style={({ pressed }) => [
                styles.chipOuter,
                (disabled || loading) && styles.chipDisabled,
                pressed && !disabled && !loading && styles.chipPressed,
              ]}
            >
              {on ? (
                <LinearGradient
                  colors={['#22D3EE', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chipOn}
                >
                  <Ionicons name={sceneStatusChipIcon(mode)} size={16} color={colors.dark.bg} />
                  <Text style={styles.chipTxtOn}>{liveSceneLabel(mode)}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chipOff}>
                  <Ionicons name={sceneStatusChipIcon(mode)} size={16} color={colors.dark.textSecondary} />
                  <Text style={styles.chipTxtOff}>{liveSceneLabel(mode)}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingVertical: 4 },
  title: { ...typography.h3, fontSize: 15, fontWeight: '800', color: colors.neutral.white },
  meta: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18 },
  row: { gap: 8, paddingVertical: 4 },
  chipOuter: { borderRadius: borderRadius.full },
  chipDisabled: { opacity: 0.45 },
  chipPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  chipOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipTxtOn: { ...typography.caption, fontSize: 11, fontWeight: '800', color: colors.dark.bg },
  chipTxtOff: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary },
});
