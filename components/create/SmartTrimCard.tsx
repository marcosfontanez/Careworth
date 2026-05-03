import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
  durationSec: number;
  onHint?: () => void;
}

/**
 * True silence-based trim needs ffmpeg / native analysis. Trim sliders above are the
 * on-device planning hook until export-time trimming ships.
 */
export function SmartTrimCard({ durationSec, onHint }: Props) {
  if (durationSec < 50) return null;

  return (
    <View style={styles.wrap}>
      <Ionicons name="cut-outline" size={20} color={colors.primary.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Smart trim</Text>
        <Text style={styles.sub}>
          Use the waveform trim sliders to mark a tighter window. The upload is still the full file for now — we’ll
          pair these marks with server-side trimming next.
        </Text>
      </View>
      {onHint ? (
        <TouchableOpacity onPress={onHint} style={styles.btnWrap}>
          <Text style={styles.btnText}>Tips</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primary.gold + '12',
    borderWidth: 1,
    borderColor: colors.primary.gold + '44',
  },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 3, lineHeight: 15 },
  btnWrap: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.dark.card },
  btnText: { fontSize: 11, fontWeight: '800', color: colors.primary.teal },
});
