import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { COMMENT_MAX_LENGTH } from '@/constants';

interface Props {
  /** Current body the author is editing. Used to seed the input. */
  initialContent: string;
  /**
   * Saves the new body. Returns a promise so the composer can show a
   * spinner + disable submit while the network call is in flight.
   * Should throw on failure; the composer surfaces a retry affordance.
   */
  onSave: (nextContent: string) => Promise<void>;
  /** Cancel / close the composer without writing anything. */
  onCancel: () => void;
  /** Optional accent used for the Save button ring. Defaults to teal. */
  accent?: string;
  /**
   * When true, visually dims + disables the composer (used while the
   * owning screen is flushing other mutations). The internal spinner
   * takes over once Save is tapped, so callers don't need to manage
   * two loading states.
   */
  disabled?: boolean;
  /** Override the max length; defaults to the shared COMMENT_MAX_LENGTH. */
  maxLength?: number;
  /** Placeholder to show when the input is empty (rare during edit). */
  placeholder?: string;
}

/**
 * Inline editor shown in-place of a comment's body + action row while
 * the author is revising their own comment. Shared between the feed
 * comment surfaces (`/comments/[postId]`, `/post/[id]`) and the My
 * Pulse comment surface (`/my-pulse/[id]`) so the save/cancel UX is
 * identical everywhere. Keeps state local — parent owns the mutation
 * + cache patch via `onSave`.
 */
export function CommentEditComposer({
  initialContent,
  onSave,
  onCancel,
  accent = colors.primary.teal,
  disabled = false,
  maxLength = COMMENT_MAX_LENGTH,
  placeholder = 'Edit your comment…',
}: Props) {
  const [text, setText] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  /**
   * Focus on mount so the keyboard pops immediately — otherwise the
   * user has to tap twice to start editing. We also bring the caret
   * to the end of the existing text (default React Native behavior is
   * to place it at the start, which feels off when you want to append
   * to your own comment).
   */
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, []);

  const trimmed = text.trim();
  const isEmpty = trimmed.length === 0;
  const isUnchanged = trimmed === initialContent.trim();
  const atLimit = text.length >= maxLength;
  const canSave = !isEmpty && !isUnchanged && !saving && !disabled;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  }, [canSave, onSave, trimmed]);

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        multiline
        editable={!disabled && !saving}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textMuted}
        maxLength={maxLength}
        style={[
          styles.input,
          { borderColor: `${accent}55` },
          disabled ? styles.inputDisabled : null,
        ]}
        returnKeyType="default"
      />

      <View style={styles.actions}>
        <Text
          style={[styles.count, atLimit ? { color: accent } : null]}
          accessibilityLiveRegion="polite"
        >
          {text.length}/{maxLength}
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.cancelBtn}
          accessibilityLabel="Cancel edit"
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
          style={[
            styles.saveBtn,
            { backgroundColor: canSave ? accent : `${accent}44` },
          ]}
          accessibilityLabel="Save edit"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={13} color="#FFF" />
              <Text style={styles.saveLabel}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 2,
  },
  input: {
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.text,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: 0.2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.chip,
    minWidth: 70,
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.25,
  },
});
