import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors, borderRadius } from '@/theme';
import {
  getComposerFlairOptions,
  safetyNoteForFlairTag,
  type CircleFlairTag,
} from '@/lib/circleFlairs';
import type { CircleAccent } from '@/lib/circleAccents';

type Props = {
  accent: CircleAccent;
  slug: string;
  categories?: string[];
  selected: CircleFlairTag | null;
  onSelect: (tag: CircleFlairTag | null) => void;
  /** Confessions rooms — shorter helper copy under the label. */
  isConfessions?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  showOptionalHint?: boolean;
};

/**
 * Optional flair picker for Circle thread/question composer.
 * Tap a chip to select; tap again to clear. Does not block posting without a flair.
 */
export function CircleComposerFlairPicker({
  accent,
  slug,
  categories,
  selected,
  onSelect,
  isConfessions,
  disabled,
  label = 'Flair (optional)',
  hint,
  showOptionalHint = true,
}: Props) {
  const options = getComposerFlairOptions(slug, categories);
  const safety = safetyNoteForFlairTag(selected);
  const helper =
    hint ??
    (isConfessions
      ? 'Your name stays hidden — keep details general.'
      : showOptionalHint
        ? 'Help others browse — pick one tag if it fits.'
        : undefined);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.hint}>{helper}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const tag = opt.flairTag!;
          const isActive = selected === tag;
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => onSelect(isActive ? null : tag)}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${opt.label} flair${isActive ? ', selected' : ''}`}
              style={[
                styles.chip,
                isActive && { borderColor: accent.color, backgroundColor: `${accent.color}18` },
              ]}
            >
              <Text style={[styles.chipText, isActive && { color: accent.color, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {safety ? <Text style={styles.safety}>{safety}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.dark.textPrimary, marginBottom: 2 },
  hint: { fontSize: 12, color: colors.dark.textMuted, marginBottom: 8 },
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  chipText: { fontSize: 13, color: colors.dark.textSecondary, fontWeight: '600' },
  safety: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
});
