import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  durationSec: number;
  /** Called once the user confirms; the video file isn't actually re-encoded — we
   * pass back N { startSec, endSec } slices so the parent can stage them as
   * separate drafts later. */
  onSplit: (slices: Array<{ startSec: number; endSec: number; index: number; total: number }>) => void;
}

const PRESETS = [2, 3, 4, 5];

export function ClipSplitterModal({ visible, onClose, durationSec, onSplit }: Props) {
  const [n, setN] = useState(3);
  const sliceLen = durationSec / Math.max(1, n);

  const split = () => {
    const slices = Array.from({ length: n }, (_, i) => ({
      startSec: Number((i * sliceLen).toFixed(2)),
      endSec: Number(((i + 1) * sliceLen).toFixed(2)),
      index: i + 1,
      total: n,
    }));
    onSplit(slices);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Split into clips</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lede}>
            Turn one long upload into a series of short posts. Each clip becomes Part 1, 2, 3 of a
            shared series.
          </Text>

          <View style={styles.chipRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, n === p && styles.chipOn]}
                onPress={() => setN(p)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, n === p && { color: colors.primary.teal }]}>{p} clips</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.preview}>
            {Array.from({ length: n }, (_, i) => (
              <View key={i} style={[styles.slice, { flex: 1 }]}>
                <Text style={styles.sliceText}>{i + 1}</Text>
                <Text style={styles.sliceTime}>{fmt(sliceLen)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.helper}>
            We&apos;ll create {n} draft posts linked as a series. You can edit each before publishing.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={split} activeOpacity={0.85}>
            <Ionicons name="cut" size={16} color="#FFF" />
            <Text style={styles.primaryText}>Create {n} clip drafts</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28,
    borderTopWidth: 1, borderColor: colors.dark.border, gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dark.cardAlt, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  title: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  lede: { fontSize: 12, color: colors.dark.textSecondary, lineHeight: 17 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.dark.card, alignItems: 'center',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  chipOn: { borderColor: colors.primary.teal, backgroundColor: colors.primary.teal + '22' },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.dark.textSecondary },
  preview: { flexDirection: 'row', gap: 4, marginTop: 4 },
  slice: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 8, borderWidth: 1, borderColor: colors.dark.border,
  },
  sliceText: { fontSize: 14, fontWeight: '900', color: colors.dark.text },
  sliceTime: { fontSize: 10, fontWeight: '700', color: colors.dark.textMuted, marginTop: 2 },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
  primaryBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary.teal,
  },
  primaryText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
