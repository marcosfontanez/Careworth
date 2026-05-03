import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface EducationCitation {
  label: string;
  url: string;
  /** Optional DOI string (displayed in Sources block). */
  doi?: string;
  /** Optional “last reviewed” note, e.g. Aug 2025. */
  lastReviewed?: string;
}

interface Props {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  citations: EducationCitation[];
  onChange: (next: EducationCitation[]) => void;
}

export function EducationModeToggle({ enabled, onToggle, citations, onChange }: Props) {
  const [draftLabel, setDraftLabel] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftDoi, setDraftDoi] = useState('');
  const [draftReviewed, setDraftReviewed] = useState('');

  const add = () => {
    const url = draftUrl.trim();
    if (!url) return;
    onChange([
      ...citations,
      {
        label: draftLabel.trim() || url,
        url,
        doi: draftDoi.trim() || undefined,
        lastReviewed: draftReviewed.trim() || undefined,
      },
    ]);
    setDraftLabel('');
    setDraftUrl('');
    setDraftDoi('');
    setDraftReviewed('');
  };

  const remove = (idx: number) => onChange(citations.filter((_, i) => i !== idx));

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.toggleRow, enabled && styles.toggleRowOn]}
        onPress={() => onToggle(!enabled)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={enabled ? 'school' : 'school-outline'}
          size={20}
          color={enabled ? '#10B981' : colors.dark.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, enabled && { color: '#10B981' }]}>Education mode</Text>
          <Text style={styles.toggleSub}>Adds an Educator chip and lets you cite sources.</Text>
        </View>
        <View style={[styles.switch, enabled && styles.switchOn]}>
          <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
        </View>
      </TouchableOpacity>

      {enabled ? (
        <View style={styles.editor}>
          <Text style={styles.label}>Citations</Text>
          {citations.map((c, idx) => (
            <View key={`${c.url}_${idx}`} style={styles.citeRow}>
              <Ionicons name="link" size={14} color={colors.primary.teal} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.citeLabel}>{c.label}</Text>
                <Text numberOfLines={1} style={styles.citeUrl}>{c.url}</Text>
                {c.doi ? <Text style={styles.citeMeta}>DOI: {c.doi}</Text> : null}
                {c.lastReviewed ? <Text style={styles.citeMeta}>Reviewed: {c.lastReviewed}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => remove(idx)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.draftRow}>
            <TextInput
              style={[styles.input, { flex: 0.45 }]}
              value={draftLabel}
              onChangeText={setDraftLabel}
              placeholder="Source label"
              placeholderTextColor={colors.dark.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 0.55 }]}
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="https://…"
              placeholderTextColor={colors.dark.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.addBtn} onPress={add} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
          <View style={styles.draftRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={draftDoi}
              onChangeText={setDraftDoi}
              placeholder="DOI (optional)"
              placeholderTextColor={colors.dark.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={draftReviewed}
              onChangeText={setDraftReviewed}
              placeholder="Last reviewed (optional)"
              placeholderTextColor={colors.dark.textMuted}
            />
          </View>
          <Text style={styles.helper}>
            Up to 5 citations. We render them as a Sources block under your post.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  toggleRowOn: { borderColor: '#10B981' + '88', backgroundColor: '#10B98114' },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  toggleSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  switch: {
    width: 38, height: 22, borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    padding: 2, justifyContent: 'center',
  },
  switchOn: { backgroundColor: '#10B981' },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  switchKnobOn: { transform: [{ translateX: 16 }] },

  editor: {
    padding: 12, borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1, borderColor: colors.dark.border, gap: 8,
  },
  label: { fontSize: 12, fontWeight: '800', color: colors.dark.textSecondary },
  citeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: 8, backgroundColor: colors.dark.bg,
  },
  citeLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.text },
  citeUrl: { fontSize: 11, color: colors.dark.textMuted },
  citeMeta: { fontSize: 10, color: colors.dark.textMuted, marginTop: 2 },
  draftRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    backgroundColor: colors.dark.bg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 12,
    color: colors.dark.text, borderWidth: 1, borderColor: colors.dark.border,
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#10B981' + '22', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#10B981' + '55',
  },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
});
