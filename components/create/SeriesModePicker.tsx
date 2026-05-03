import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import {
  listRecentSeries,
  startNewSeries,
  nextPartOf,
  type SeriesPost,
  type SeriesSelection,
} from '@/lib/seriesMode';

interface Props {
  userId: string | null;
  selection: SeriesSelection | null;
  onChange: (next: SeriesSelection | null) => void;
}

export function SeriesModePicker({ userId, selection, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<SeriesPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    listRecentSeries(userId).then((rows) => {
      if (!cancelled) {
        setSeries(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const summary = selection
    ? `Part ${selection.seriesPart} of ${Math.max(selection.seriesTotal, selection.seriesPart)}`
    : 'Off';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.row, selection && styles.rowOn]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Ionicons
          name="albums-outline"
          size={20}
          color={selection ? '#EC4899' : colors.dark.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, selection && { color: '#EC4899' }]}>Series mode</Text>
          <Text style={styles.sub}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Series mode</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sub}>Chain posts as Part 1, 2, 3 — your audience auto-sees the next part.</Text>

            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.85}
              onPress={() => {
                onChange(startNewSeries());
                setOpen(false);
              }}
            >
              <Ionicons name="add-circle" size={20} color="#EC4899" />
              <Text style={styles.actionText}>Start a new series (this is Part 1)</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Continue a recent series</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary.teal} style={{ marginVertical: 12 }} />
            ) : series.length === 0 ? (
              <Text style={styles.emptyText}>You haven&apos;t started a series in the last 30 days.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {series.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.seriesRow}
                    onPress={() => {
                      onChange(nextPartOf(s));
                      setOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    {s.thumbnail_url || s.media_url ? (
                      <Image source={{ uri: s.thumbnail_url ?? s.media_url ?? '' }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="document-text" size={20} color={colors.dark.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partText}>
                        Part {s.series_part ?? '?'} of {s.series_total ?? '?'}
                      </Text>
                      <Text style={styles.captionText} numberOfLines={2}>{s.caption}</Text>
                      <Text style={styles.nextText}>Next will be Part {(s.series_part ?? 1) + 1}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selection ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.clearText}>Turn off series mode</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  rowOn: { borderColor: '#EC4899' + '88', backgroundColor: '#EC489914' },
  title: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },

  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28,
    borderTopWidth: 1, borderColor: colors.dark.border, gap: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dark.cardAlt, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#EC489914', borderWidth: 1, borderColor: '#EC4899' + '55',
  },
  actionText: { fontSize: 13, fontWeight: '800', color: '#EC4899' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  emptyText: { fontSize: 12, color: colors.dark.textMuted, paddingVertical: 12 },
  seriesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.dark.cardAlt },
  partText: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  captionText: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 2 },
  nextText: { fontSize: 11, color: '#EC4899', fontWeight: '700', marginTop: 4 },
  clearBtn: {
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.dark.border,
    alignItems: 'center', marginTop: 6,
  },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.dark.textMuted },
});
