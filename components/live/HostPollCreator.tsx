import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    question: string;
    options: Array<{ id: string; text: string }>;
    durationSec: number;
  }) => Promise<void> | void;
}

const DEFAULT_OPTIONS = [
  { id: 'a', text: '' },
  { id: 'b', text: '' },
];

const DURATION_CHOICES = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
];

const QUESTION_MAX = 140;
const OPTION_MAX = 80;
const MAX_OPTIONS = 4;

/**
 * Modal surfaced to hosts from the viewer room. Lets a host draft a poll
 * (question + 2–4 options + duration) and submit it. Submission is fully
 * delegated to the parent — this component is just a form.
 */
export function HostPollCreator({ visible, onClose, onSubmit }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [durationSec, setDurationSec] = useState(60);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setQuestion('');
    setOptions(DEFAULT_OPTIONS);
    setDurationSec(60);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
  }, [busy, reset, onClose]);

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    const nextId = String.fromCharCode(
      'a'.charCodeAt(0) + options.length,
    );
    setOptions((prev) => [...prev, { id: nextId, text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const trimmedOptions = options
    .map((o) => ({ ...o, text: o.text.trim() }))
    .filter((o) => o.text.length > 0);

  const canSubmit =
    !busy && question.trim().length >= 2 && trimmedOptions.length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit({
        question: question.trim(),
        options: trimmedOptions,
        durationSec,
      });
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheet}>
          <View style={styles.grip} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Create Poll</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10} disabled={busy}>
              <Ionicons name="close" size={22} color={colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Question</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you want to ask viewers?"
              placeholderTextColor={colors.dark.textMuted}
              value={question}
              onChangeText={setQuestion}
              maxLength={QUESTION_MAX}
              multiline
            />
            <Text style={styles.charCount}>
              {question.length}/{QUESTION_MAX}
            </Text>

            <Text style={styles.label}>Options</Text>
            {options.map((opt, i) => (
              <View key={opt.id} style={styles.optionRow}>
                <View style={styles.optionIndex}>
                  <Text style={styles.optionIndexText}>{i + 1}</Text>
                </View>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.dark.textMuted}
                  value={opt.text}
                  onChangeText={(t) => updateOption(opt.id, t)}
                  maxLength={OPTION_MAX}
                />
                {options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removeOption(opt.id)}
                    hitSlop={8}
                    style={styles.optionRemove}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.dark.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < MAX_OPTIONS && (
              <TouchableOpacity
                onPress={addOption}
                style={styles.addOptionBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.primary.teal} />
                <Text style={styles.addOptionText}>Add option</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_CHOICES.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => setDurationSec(d.value)}
                  style={[
                    styles.durationPill,
                    durationSec === d.value && styles.durationPillActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.durationText,
                      durationSec === d.value && styles.durationTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
              ]}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={colors.dark.bg} />
              ) : (
                <Text style={styles.submitText}>Launch Poll</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderColor: colors.dark.borderInner,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    maxHeight: '85%',
    ...shadows.sheet,
  },
  grip: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.borderInner,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  scroll: { maxHeight: 560 },
  scrollContent: { paddingBottom: spacing.lg },
  label: {
    ...typography.label,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.dark.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.borderInner,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.teal,
  },
  optionInput: {
    flex: 1,
    backgroundColor: colors.dark.elevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.borderInner,
  },
  optionRemove: { padding: 4 },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary.teal + '15',
    borderWidth: 1,
    borderColor: colors.primary.teal + '40',
    marginTop: spacing.xs,
  },
  addOptionText: { ...typography.button, fontSize: 12, color: colors.primary.teal },
  durationRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  durationPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    backgroundColor: colors.dark.elevated,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
  },
  durationPillActive: {
    backgroundColor: colors.primary.teal + '22',
    borderColor: colors.primary.teal,
  },
  durationText: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },
  durationTextActive: { color: colors.primary.teal },
  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.cta,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.bg,
  },
});
