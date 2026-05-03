import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { isFutureMinutesAway, formatScheduleLabel } from '@/lib/scheduledPosts';

interface Props {
  scheduledAt: Date | null;
  onChange: (next: Date | null) => void;
}

const PRESETS: Array<{ label: string; minutes: number }> = [
  { label: 'In 1 hour', minutes: 60 },
  { label: 'In 3 hours', minutes: 180 },
  { label: 'Tonight 8pm', minutes: -1 }, // special-cased below
  { label: 'Tomorrow 9am', minutes: -2 },
  { label: 'Tomorrow 6pm', minutes: -3 },
  { label: 'In 3 days', minutes: 60 * 24 * 3 },
];

function presetToDate(p: typeof PRESETS[number]): Date {
  if (p.minutes >= 0) return new Date(Date.now() + p.minutes * 60_000);
  const d = new Date();
  if (p.minutes === -1) {
    d.setHours(20, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }
  if (p.minutes === -2) {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export function SchedulePostPicker({ scheduledAt, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const enabled = !!scheduledAt;
  const summary = scheduledAt ? formatScheduleLabel(scheduledAt) : 'Post now';

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, enabled && styles.rowOn]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={enabled ? 'time' : 'time-outline'}
          size={20}
          color={enabled ? '#0EA5E9' : colors.dark.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, enabled && { color: '#0EA5E9' }]}>Schedule</Text>
          <Text style={styles.sub}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Schedule post</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.lede}>
              Pick a time. Your post will go live automatically.
            </Text>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
              {PRESETS.map((p) => {
                const d = presetToDate(p);
                const ok = isFutureMinutesAway(d);
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.presetRow, !ok && { opacity: 0.4 }]}
                    onPress={() => {
                      if (!ok) return;
                      onChange(d);
                      setOpen(false);
                    }}
                    disabled={!ok}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#0EA5E9" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.presetLabel}>{p.label}</Text>
                      <Text style={styles.presetTime}>{formatScheduleLabel(d)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {enabled ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={16} color={colors.primary.teal} />
                <Text style={styles.clearText}>Post now instead</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.helper}>
              Note: scheduled posts go out via the dispatcher. If you don&apos;t see it post on time,
              the dispatcher edge function may not be deployed yet — your post is saved as a
              scheduled draft and will go live as soon as it runs.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  rowOn: { borderColor: '#0EA5E9' + '88', backgroundColor: '#0EA5E914' },
  title: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28,
    borderTopWidth: 1, borderColor: colors.dark.border, gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dark.cardAlt, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  lede: { fontSize: 12, color: colors.dark.textSecondary, lineHeight: 16 },
  presetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  presetLabel: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  presetTime: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.dark.border, marginTop: 6,
  },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.primary.teal },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
});
