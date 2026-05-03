import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { suggestHashtags, appendHashtag, removeHashtag, parseExisting } from '@/lib/hashtagStudio';

interface Props {
  visible: boolean;
  onClose: () => void;
  caption: string;
  shortTitle?: string;
  overlay?: string;
  shift?: string | null;
  specialty?: string | null;
  hashtags: string;
  onChange: (next: string) => void;
}

export function HashtagStudioModal({
  visible, onClose, caption, shortTitle, overlay, shift, specialty, hashtags, onChange,
}: Props) {
  const suggestions = useMemo(
    () => suggestHashtags({
      caption,
      shortTitle,
      overlay,
      shift,
      specialty,
      existing: hashtags,
      limit: 12,
    }),
    [caption, shortTitle, overlay, shift, specialty, hashtags],
  );

  const active = useMemo(() => parseExisting(hashtags), [hashtags]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={20} color={colors.primary.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Hashtag Studio</Text>
              <Text style={styles.sub}>Suggested from your caption + healthcare lexicon. Tap to add.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>

          {active.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>In your post</Text>
              <View style={styles.chipsRow}>
                {active.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.activeChip}
                    onPress={() => onChange(removeHashtag(hashtags, tag))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.activeChipText}>#{tag}</Text>
                    <Ionicons name="close" size={12} color={colors.primary.teal} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Suggested</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.chipsRow}>
                {suggestions.length === 0 ? (
                  <Text style={styles.emptyText}>Type a caption to get suggestions.</Text>
                ) : null}
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.tag}
                    style={styles.chip}
                    onPress={() => onChange(appendHashtag(hashtags, s.tag))}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.scoreDot, { backgroundColor: scoreColor(s.trendScore) }]} />
                    <Text style={styles.chipText}>#{s.tag}</Text>
                    <Text style={styles.scoreText}>{s.trendScore}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <Text style={styles.helper}>
            Trend score is a quick popularity hint. Mix evergreen (high) with niche (lower) tags.
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return '#22C55E';
  if (s >= 60) return '#0EA5E9';
  if (s >= 45) return '#F59E0B';
  return '#9CA3AF';
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28,
    borderTopWidth: 1, borderColor: colors.dark.border,
    gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dark.cardAlt, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.primary.teal + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.dark.text },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreText: { fontSize: 10, fontWeight: '800', color: colors.dark.textMuted },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.primary.teal + '22',
    borderWidth: 1, borderColor: colors.primary.teal + '88',
  },
  activeChipText: { fontSize: 12, fontWeight: '800', color: colors.primary.teal },
  emptyText: { fontSize: 12, color: colors.dark.textMuted },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
  doneBtn: {
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary.teal, alignItems: 'center',
  },
  doneText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
