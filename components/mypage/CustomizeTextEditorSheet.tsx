import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, gradients } from '@/theme';

/**
 * Focused single-field editor used by the Customize → Look rows card.
 *
 * Why this is a sheet instead of inline:
 *   The previous Customize layout stacked every field's label, hint, input,
 *   and counter inline, which made the Look tab a long scroll. The rows
 *   card pattern (mockup-driven) needs each field to open its own focused
 *   editor — a small bottom sheet works on phones, keeps the keyboard
 *   anchored, and never makes the parent screen scroll.
 *
 * The component is intentionally generic: tags vs intro just differ in
 * the input mode (single line + character cap / multiline), label text,
 * and validation hint.
 */

export type CustomizeTextEditorSheetProps = {
  visible: boolean;
  /** Stable label, e.g. "Neon Tags" or "Page Intro". */
  title: string;
  /** Tiny eyebrow text shown above the title. */
  kicker?: string;
  /** One-line guidance shown under the title. */
  helperText?: string;
  /** Initial value when the sheet opens. */
  initialValue: string;
  placeholder?: string;
  /** Hard character limit enforced by the TextInput. */
  maxLength: number;
  multiline?: boolean;
  /** Visual char counter shown beneath the input; defaults to true. */
  showCounter?: boolean;
  /**
   * Optional formatter for showing what the saved value will look like —
   * useful for tags, where the underlying input is a comma-separated
   * string but the chip preview shows parsed tokens.
   */
  formatPreview?: (value: string) => React.ReactNode;
  saving?: boolean;
  onCancel: () => void;
  onSave: (value: string) => void | Promise<void>;
};

export function CustomizeTextEditorSheet({
  visible,
  title,
  kicker,
  helperText,
  initialValue,
  placeholder,
  maxLength,
  multiline = false,
  showCounter = true,
  formatPreview,
  saving = false,
  onCancel,
  onSave,
}: CustomizeTextEditorSheetProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  /** Reset the local draft whenever the sheet is reopened with a new value. */
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleSave = () => {
    if (saving) return;
    void onSave(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!saving) onCancel();
      }}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!saving) onCancel();
          }}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grab}>
              <View style={styles.grabBar} />
            </View>

            <View style={styles.header}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
                <Text style={styles.title}>{title}</Text>
              </View>
              <TouchableOpacity onPress={onCancel} hitSlop={12} disabled={saving}>
                <Ionicons name="close" size={24} color={colors.dark.text} />
              </TouchableOpacity>
            </View>

            {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

            <View style={styles.inputWrap}>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor="rgba(148,163,184,0.7)"
                maxLength={maxLength}
                multiline={multiline}
                autoFocus
                style={[styles.input, multiline ? styles.inputMultiline : null]}
                editable={!saving}
                scrollEnabled={multiline}
              />
            </View>

            {formatPreview ? (
              <View style={styles.previewWrap}>{formatPreview(value)}</View>
            ) : null}

            {showCounter ? (
              <Text
                style={[
                  styles.counter,
                  value.length >= maxLength - 6
                    ? { color: colors.status.warning ?? colors.primary.teal }
                    : null,
                ]}
              >
                {value.length}/{maxLength}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.9}
              disabled={saving}
            >
              <LinearGradient
                colors={[...gradients.sheetDone]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtnGrad}
              >
                {saving ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.65)' },
  sheet: {
    backgroundColor: '#070F1C',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  grab: { alignItems: 'center', paddingVertical: 8 },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.35)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.4,
  },
  helper: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(148,163,184,0.95)',
    fontWeight: '600',
  },
  inputWrap: {
    marginTop: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.32)',
    backgroundColor: 'rgba(12,18,32,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    fontSize: 16,
    color: colors.dark.text,
    minHeight: 44,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  previewWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(148,163,184,0.85)',
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 18,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  saveBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#020617',
    letterSpacing: 0.3,
  },
});
