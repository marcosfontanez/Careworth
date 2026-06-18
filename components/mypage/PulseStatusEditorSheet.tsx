import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PulseBottomSheet } from '@/components/ui/pulse/PulseBottomSheet';
import { useToast } from '@/components/ui/Toast';
import { userKeys } from '@/lib/queryKeys';
import { profilesService } from '@/services/supabase/profiles';
import { supabaseMessage } from '@/utils/supabaseErrors';
import { borderRadius, colors, spacing, typography } from '@/theme';

export const PULSE_STATUS_MAX_TEXT = 120;
export const PULSE_STATUS_MAX_EMOJI = 8;

type Props = {
  visible: boolean;
  userId: string;
  initialText?: string | null;
  initialEmoji?: string | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

export function PulseStatusEditorSheet({
  visible,
  userId,
  initialText,
  initialEmoji,
  onClose,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const { applyProfilePatch } = useAuth();
  const showToast = useToast((s) => s.show);
  const [draftText, setDraftText] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  const statusText = initialText?.trim() ?? '';
  const statusEmoji = initialEmoji?.trim() ?? '';
  const hasStatus = Boolean(statusText);

  useEffect(() => {
    if (!visible) return;
    setDraftText(statusText);
    setDraftEmoji(statusEmoji);
  }, [visible, statusText, statusEmoji]);

  const persist = useCallback(
    async (next: {
      pulse_status_text: string | null;
      pulse_status_emoji: string | null;
      pulse_status_updated_at: string | null;
    }) => {
      setSaving(true);
      try {
        await profilesService.update(userId, next);
        applyProfilePatch({
          pulseStatusText: next.pulse_status_text,
          pulseStatusEmoji: next.pulse_status_emoji,
          pulseStatusUpdatedAt: next.pulse_status_updated_at,
        });
        await queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
        await onSaved?.();
        onClose();
        showToast(
          next.pulse_status_text ? "Today's Pulse updated" : "Today's Pulse cleared",
          'success',
        );
      } catch (e) {
        showToast(supabaseMessage(e) || 'Could not save status', 'error');
      } finally {
        setSaving(false);
      }
    },
    [applyProfilePatch, onClose, onSaved, queryClient, showToast, userId],
  );

  const onSave = () => {
    const trimmed = draftText.trim();
    if (!trimmed) {
      void persist({
        pulse_status_text: null,
        pulse_status_emoji: null,
        pulse_status_updated_at: null,
      });
      return;
    }
    const emoji = draftEmoji.trim().slice(0, PULSE_STATUS_MAX_EMOJI) || null;
    void persist({
      pulse_status_text: trimmed.slice(0, PULSE_STATUS_MAX_TEXT),
      pulse_status_emoji: emoji,
      pulse_status_updated_at: new Date().toISOString(),
    });
  };

  const onClear = () => {
    void persist({
      pulse_status_text: null,
      pulse_status_emoji: null,
      pulse_status_updated_at: null,
    });
  };

  return (
    <PulseBottomSheet
      visible={visible}
      onClose={() => !saving && onClose()}
      title="Today's Pulse"
      maxHeightRatio={0.55}
      scrollable
    >
      <Text style={styles.sheetHelper}>
        Your intro line on My Pulse — a short status under your tags. Resets when you clear it.
      </Text>
      <Text style={styles.fieldLabel}>Emoji (optional)</Text>
      <TextInput
        value={draftEmoji}
        onChangeText={(t) => setDraftEmoji(t.slice(0, PULSE_STATUS_MAX_EMOJI))}
        placeholder="✨"
        placeholderTextColor={colors.dark.textMuted}
        style={styles.emojiInput}
        maxLength={PULSE_STATUS_MAX_EMOJI}
        accessibilityLabel="Status emoji"
      />
      <Text style={styles.fieldLabel}>Status</Text>
      <TextInput
        value={draftText}
        onChangeText={(t) => setDraftText(t.slice(0, PULSE_STATUS_MAX_TEXT))}
        placeholder="On night shift · feeling grounded"
        placeholderTextColor={colors.dark.textMuted}
        style={styles.textInput}
        multiline
        maxLength={PULSE_STATUS_MAX_TEXT}
        accessibilityLabel="Status text"
      />
      <Text style={styles.counter}>
        {draftText.length}/{PULSE_STATUS_MAX_TEXT}
      </Text>
      <View style={styles.sheetActions}>
        {hasStatus ? (
          <TouchableOpacity
            onPress={onClear}
            disabled={saving}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear today's Pulse"
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity
          onPress={onClose}
          disabled={saving}
          style={styles.secondaryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={styles.primaryBtn}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#021627" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </PulseBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHelper: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  emojiInput: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.dark.text,
    fontSize: 22,
    textAlign: 'center',
    backgroundColor: colors.dark.elevated,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.dark.text,
    fontSize: 15,
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: colors.dark.elevated,
  },
  counter: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  clearBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  clearBtnText: {
    ...typography.bodySmall,
    color: colors.status.error,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  secondaryBtnText: {
    ...typography.bodySmall,
    color: colors.dark.text,
    fontWeight: '600',
  },
  primaryBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
    minWidth: 88,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.bodySmall,
    color: '#021627',
    fontWeight: '800',
  },
});
