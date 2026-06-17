import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PulseBottomSheet } from '@/components/ui/pulse/PulseBottomSheet';
import { CircleComposerFlairPicker } from '@/components/circles/CircleComposerFlairPicker';
import { colors, borderRadius } from '@/theme';
import type { CircleAccent } from '@/lib/circleAccents';
import type { CircleFlairTag } from '@/lib/circleFlairs';

type Props = {
  visible: boolean;
  onClose: () => void;
  accent: CircleAccent;
  slug: string;
  categories?: string[];
  initialFlairTag: CircleFlairTag | null;
  isConfessions?: boolean;
  saving?: boolean;
  onSave: (flairTag: CircleFlairTag | null) => Promise<void>;
};

/** Edit existing thread flair — same catalog as composer; optional clear. */
export function CircleEditFlairSheet({
  visible,
  onClose,
  accent,
  slug,
  categories,
  initialFlairTag,
  isConfessions,
  saving = false,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<CircleFlairTag | null>(initialFlairTag);

  useEffect(() => {
    if (visible) setDraft(initialFlairTag);
  }, [visible, initialFlairTag]);

  const unchanged = draft === initialFlairTag;

  return (
    <PulseBottomSheet visible={visible} onClose={onClose} title="Edit flair" scrollable>
      <CircleComposerFlairPicker
        accent={accent}
        slug={slug}
        categories={categories}
        selected={draft}
        onSelect={setDraft}
        isConfessions={isConfessions}
        disabled={saving}
        label="Choose a flair"
        hint="Tap a chip to select. Tap again to clear — the thread keeps its current type."
        showOptionalHint={false}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onClose}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: accent.color },
            (unchanged || saving) && styles.primaryDisabled,
          ]}
          onPress={() => void onSave(draft)}
          disabled={unchanged || saving}
          accessibilityRole="button"
          accessibilityLabel="Save flair"
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.primaryText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </PulseBottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '600', color: colors.dark.textSecondary },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
