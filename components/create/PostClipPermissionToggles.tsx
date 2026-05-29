import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

export type PostClipPermissionValues = {
  allowViewerClips: boolean;
  allowRemix: boolean;
  allowClipDownloads: boolean;
};

type Props = {
  values: PostClipPermissionValues;
  onChange: (patch: Partial<PostClipPermissionValues>) => void;
  disabled?: boolean;
  compact?: boolean;
};

/** Creator-facing clip/remix/download toggles with education copy. */
export function PostClipPermissionToggles({
  values,
  onChange,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>Allow clips</Text>
          <Text style={styles.hint}>
            Let others create short clips from this video with attribution.
          </Text>
        </View>
        <Switch
          value={values.allowViewerClips}
          onValueChange={(v) => onChange({ allowViewerClips: v })}
          disabled={disabled}
          trackColor={{ true: pulseColors.teal, false: pulseColors.border }}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>Allow remix</Text>
          <Text style={styles.hint}>Let others duet, stitch, or use this video&apos;s sound.</Text>
        </View>
        <Switch
          value={values.allowRemix}
          onValueChange={(v) => onChange({ allowRemix: v })}
          disabled={disabled}
          trackColor={{ true: pulseColors.teal, false: pulseColors.border }}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>Allow downloads</Text>
          <Text style={styles.hint}>Let others save this video outside PulseVerse.</Text>
        </View>
        <Switch
          value={values.allowClipDownloads}
          onValueChange={(v) => onChange({ allowClipDownloads: v })}
          disabled={disabled}
          trackColor={{ true: pulseColors.teal, false: pulseColors.border }}
        />
      </View>

      <View style={styles.attributionRow}>
        <Ionicons name="information-circle-outline" size={16} color={pulseColors.mutedText} />
        <Text style={styles.attributionHint}>
          Clips always include creator attribution — this cannot be turned off.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: pulseSpacing.md,
    padding: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: pulseColors.glass,
  },
  wrapCompact: {
    padding: pulseSpacing.sm,
    gap: pulseSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: pulseSpacing.md,
  },
  copy: { flex: 1, gap: 2 },
  label: { ...pulseTypography.bodySmall, fontWeight: '700', color: pulseColors.text },
  hint: { ...pulseTypography.caption, color: pulseColors.mutedText },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: pulseSpacing.xs,
    paddingTop: pulseSpacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pulseColors.border,
  },
  attributionHint: {
    ...pulseTypography.caption,
    color: pulseColors.mutedText,
    flex: 1,
  },
});
