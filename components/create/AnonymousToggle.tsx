import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { defaultAnonymousChecklist, type AnonymousChecklistItem } from '@/lib/anonymousPosting';

interface Props {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  onChecklistChange?: (items: AnonymousChecklistItem[]) => void;
  /** Extra strong blur on the composer preview only (anonymous drafts). */
  strongPreviewBlur?: boolean;
  onStrongPreviewBlurChange?: (next: boolean) => void;
}

export function AnonymousToggle({
  enabled,
  onToggle,
  onChecklistChange,
  strongPreviewBlur = false,
  onStrongPreviewBlurChange,
}: Props) {
  const [checklist, setChecklist] = useState<AnonymousChecklistItem[]>(() => defaultAnonymousChecklist());

  const flip = (id: string) => {
    setChecklist((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
      onChecklistChange?.(next);
      return next;
    });
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.toggleRow, enabled && styles.toggleRowOn]}
        onPress={() => onToggle(!enabled)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={enabled ? 'eye-off' : 'eye-off-outline'}
          size={20}
          color={enabled ? '#A855F7' : colors.dark.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, enabled && { color: '#A855F7' }]}>
            Post anonymously
          </Text>
          <Text style={styles.toggleSub}>
            Hide your handle and name. Strips image/video metadata.
          </Text>
        </View>
        <View style={[styles.switch, enabled && styles.switchOn]}>
          <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
        </View>
      </TouchableOpacity>

      {enabled && onStrongPreviewBlurChange ? (
        <TouchableOpacity
          style={[styles.blurRow, strongPreviewBlur && styles.blurRowOn]}
          onPress={() => onStrongPreviewBlurChange(!strongPreviewBlur)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={strongPreviewBlur ? 'layers' : 'layers-outline'}
            size={18}
            color={strongPreviewBlur ? '#A855F7' : colors.dark.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.blurTitle, strongPreviewBlur && { color: '#A855F7' }]}>
              Strong blur on preview
            </Text>
            <Text style={styles.toggleSub}>
              Extra privacy while editing — does not change your photo/video file.
            </Text>
          </View>
          <View style={[styles.switch, strongPreviewBlur && styles.switchOn]}>
            <View style={[styles.switchKnob, strongPreviewBlur && styles.switchKnobOn]} />
          </View>
        </TouchableOpacity>
      ) : null}

      {enabled ? (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Stay safe — confirm each:</Text>
          {checklist.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.checkRow}
              onPress={() => (c.automated ? null : flip(c.id))}
              activeOpacity={c.automated ? 1 : 0.7}
              disabled={c.automated}
            >
              <Ionicons
                name={c.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={c.done ? '#22C55E' : colors.dark.textMuted}
              />
              <Text style={[styles.checkLabel, c.done && { color: colors.dark.text }]}>
                {c.label}
              </Text>
              {c.automated ? (
                <Text style={styles.autoTag}>auto</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  toggleRowOn: { borderColor: '#A855F7' + '88', backgroundColor: '#A855F71A' },
  blurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  blurRowOn: { borderColor: '#A855F766', backgroundColor: '#A855F714' },
  blurTitle: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  toggleSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  switch: {
    width: 38,
    height: 22,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: '#A855F7' },
  switchKnob: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF',
  },
  switchKnobOn: { transform: [{ translateX: 16 }] },
  checklist: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 6,
  },
  checklistTitle: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary },
  autoTag: {
    fontSize: 10, fontWeight: '800', color: '#22C55E',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: '#22C55E1A',
  },
});
