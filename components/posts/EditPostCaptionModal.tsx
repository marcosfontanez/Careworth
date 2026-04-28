import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '@/theme';

/**
 * Most posts don't have a hard caption cap (some feed posts are just
 * media), but we want the editor to give the author a reasonable
 * horizon so they don't paste War & Peace into the caption field. 500
 * lines up with the composer used on the create flow.
 */
const CAPTION_MAX_LENGTH = 500;

interface Props {
  visible: boolean;
  /** Current caption the author is editing. Seeds the input on open. */
  initialCaption: string;
  /**
   * Accent colour used for the Save button ring. Passed in by the
   * parent screen so we match whatever circle / feed theme it's using.
   */
  accent?: string;
  /**
   * Saves the new caption. Parent owns the mutation + cache patch.
   * Thrown errors surface as an inline retry hint inside the modal.
   */
  onSave: (nextCaption: string) => Promise<void>;
  onClose: () => void;
  /**
   * Title shown at the top of the sheet. Defaults to "Edit caption"
   * so the feed post screens don't have to pass anything; My Pulse
   * surfaces override it to "Edit thought" / "Edit note" etc.
   */
  title?: string;
  /** Override the placeholder shown when the input is empty. */
  placeholder?: string;
  /**
   * Override the helper copy shown under the input. Useful when the
   * surface isn't a feed "post" per se (e.g. editing a My Pulse row).
   */
  hint?: string;
  /**
   * Allow posts without any body (feed media posts can have empty
   * captions). My Pulse text posts set this to false to prevent the
   * author from saving a blank thought.
   */
  allowEmpty?: boolean;
}

/**
 * Full-screen modal used by the post detail screen's owner menu to
 * rewrite a post's caption. We keep the shape narrow on purpose —
 * swapping media, changing privacy, or re-tagging circles is better
 * served by delete + re-post so viewers aren't confused by a caption
 * that no longer matches the clip they're watching.
 */
export function EditPostCaptionModal({
  visible,
  initialCaption,
  accent = colors.primary.teal,
  onSave,
  onClose,
  title = 'Edit caption',
  placeholder = 'What’s the story behind this post?',
  hint = 'Your caption is updated for everyone viewing this post. Viewers will see a small “edited” tag next to the time.',
  allowEmpty = true,
}: Props) {
  const [text, setText] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  /**
   * Re-seed the input whenever the modal is re-opened. Otherwise a
   * cancelled edit on one post would leak its draft into the next
   * post the owner opens — a cheap way to accidentally publish the
   * wrong caption.
   */
  useEffect(() => {
    if (visible) {
      setText(initialCaption);
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [visible, initialCaption]);

  const trimmed = text.trim();
  const isUnchanged = trimmed === initialCaption.trim();
  const isEmpty = trimmed.length === 0;
  /**
   * Gating rules:
   *   - Disabled while saving so the user can't double-submit.
   *   - Disabled when the text hasn't drifted from the original — no
   *     point writing a no-op edit that would still flip edited_at.
   *   - When `allowEmpty` is false (My Pulse text posts) we also
   *     block saving a blank body.
   */
  const canSave = !isUnchanged && !saving && (allowEmpty || !isEmpty);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t save your edit. Try again.');
    } finally {
      setSaving(false);
    }
  }, [canSave, onSave, onClose, trimmed]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      /**
       * statusBarTranslucent keeps the input scrollable under the
       * Android status bar — without it the keyboard push-up leaves
       * a visible ghost of the status bar over our save button.
       */
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={saving ? undefined : onClose}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                disabled={saving}
                hitSlop={10}
                style={styles.closeBtn}
                accessibilityLabel="Cancel"
              >
                <Ionicons name="close" size={20} color={colors.dark.text} />
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                style={[
                  styles.saveBtn,
                  { backgroundColor: canSave ? accent : `${accent}44` },
                ]}
                accessibilityLabel="Save caption edit"
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveLabel}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={(v) => {
                setText(v);
                setError(null);
              }}
              multiline
              editable={!saving}
              placeholder={placeholder}
              placeholderTextColor={colors.dark.textMuted}
              maxLength={CAPTION_MAX_LENGTH}
              style={styles.input}
            />

            <View style={styles.footer}>
              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : (
                <Text style={styles.hint}>{hint}</Text>
              )}
              <View style={{ flex: 1 }} />
              <Text style={styles.count}>
                {text.length}/{CAPTION_MAX_LENGTH}
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderBottomWidth: 0,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.25,
  },
  input: {
    minHeight: 140,
    maxHeight: 240,
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: colors.dark.text,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  hint: {
    flex: 1,
    fontSize: 11.5,
    color: colors.dark.textMuted,
    lineHeight: 16,
  },
  error: {
    flex: 1,
    fontSize: 12,
    color: colors.status.error,
    lineHeight: 16,
    fontWeight: '600',
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
