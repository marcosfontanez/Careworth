import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '@/theme';
import { COMMENT_MAX_LENGTH } from '@/constants';

const WIN = Dimensions.get('window');
/** Fixed pixel height — multiline TextInputs must not rely on minHeight inside keyboards/modals or they often measure as 0. */
const EDIT_FIELD_HEIGHT = Math.min(280, Math.max(196, Math.round(WIN.height * 0.30)));

interface Props {
  /** Current body the author is editing. Used to seed the input. */
  initialContent: string;
  onSave: (nextContent: string) => Promise<void>;
  onCancel: () => void;
  accent?: string;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

/**
 * Bottom-sheet modal editor for comment bodies. Inline multiline fields
 * inside ScrollView/FlatList often collapse to zero height when the
 * keyboard opens; hosting the TextInput in a root Modal avoids that.
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
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setText(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const len = initialContent.length;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setNativeProps({
        selection: { start: len, end: len },
      });
    }, 150);
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

  const padBottom = Math.max(insets.bottom, 12) + spacing.sm;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!saving) onCancel();
      }}
    >
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalStack}>
          <Pressable
            style={styles.dimTap}
            onPress={saving ? undefined : onCancel}
            accessibilityLabel="Dismiss editor"
          />
          <View style={[styles.sheet, { paddingBottom: padBottom }]}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={onCancel}
                disabled={saving}
                hitSlop={12}
                style={styles.headerBtn}
                accessibilityLabel="Cancel edit"
              >
                <Ionicons name="close" size={22} color={colors.dark.text} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Edit comment</Text>
              <View style={styles.headerBtn} />
            </View>

            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              multiline
              editable={!disabled && !saving}
              placeholder={placeholder}
              placeholderTextColor={colors.dark.textMuted}
              maxLength={maxLength}
              scrollEnabled
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              selectionColor={accent}
              style={[
                styles.textField,
                { height: EDIT_FIELD_HEIGHT, borderColor: `${accent}55` },
                disabled ? styles.textFieldDisabled : null,
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
  },
  modalStack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dimTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    width: '100%',
    maxHeight: WIN.height * 0.92,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
  },
  textField: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: 15,
    lineHeight: 22,
    color: colors.dark.text,
  },
  textFieldDisabled: {
    opacity: 0.55,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: 0.2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    minWidth: 76,
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.25,
  },
});
