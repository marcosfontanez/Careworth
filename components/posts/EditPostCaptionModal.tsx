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
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';

const CAPTION_MAX_LENGTH = 500;

const WIN = Dimensions.get('window');
const CAPTION_FIELD_HEIGHT = Math.min(320, Math.max(220, Math.round(WIN.height * 0.34)));

interface Props {
  visible: boolean;
  initialCaption: string;
  accent?: string;
  onSave: (nextCaption: string) => Promise<void>;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  hint?: string;
  allowEmpty?: boolean;
}

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
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(initialCaption);
      setError(null);
      const len = initialCaption.length;
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({
          selection: { start: len, end: len },
        });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [visible, initialCaption]);

  const trimmed = text.trim();
  const isUnchanged = trimmed === initialCaption.trim();
  const isEmpty = trimmed.length === 0;
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

  const padBottom = Math.max(insets.bottom, 12) + spacing.sm;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={saving ? undefined : onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalStack}>
          <Pressable
            style={styles.dimTap}
            onPress={saving ? undefined : onClose}
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.sheet, { paddingBottom: padBottom }]}>
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

            <AccentComposerFrame
              accentColor={accent}
              hint="Caption"
              compact
              noShadow
              footer={
                <AccentCharCount
                  length={text.length}
                  max={CAPTION_MAX_LENGTH}
                  accentColor={accent}
                  warnWithin={40}
                  hideWhenEmpty={false}
                />
              }
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  setError(null);
                }}
                multiline
                scrollEnabled
                editable={!saving}
                placeholder={placeholder}
                placeholderTextColor={colors.dark.textMuted}
                maxLength={CAPTION_MAX_LENGTH}
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                selectionColor={accent}
                style={[styles.input, { height: CAPTION_FIELD_HEIGHT }]}
              />
            </AccentComposerFrame>

            {error ? <Text style={styles.errorBelow}>{error}</Text> : null}

            <Text style={styles.hintFooter}>{hint}</Text>
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
    maxHeight: WIN.height * 0.94,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
    width: '100%',
    paddingHorizontal: 6,
    paddingVertical: 8,
    color: colors.dark.text,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  hintFooter: {
    marginTop: 10,
    fontSize: 11.5,
    color: colors.dark.textMuted,
    lineHeight: 16,
  },
  errorBelow: {
    marginTop: 8,
    fontSize: 12,
    color: colors.status.error,
    lineHeight: 16,
    fontWeight: '600',
  },
});
