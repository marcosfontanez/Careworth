import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';

const REASONS = [
  { key: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { key: 'harassment', label: 'Harassment or bullying', icon: 'hand-left-outline' },
  { key: 'misinformation', label: 'Misinformation', icon: 'alert-circle-outline' },
  { key: 'inappropriate', label: 'Inappropriate content', icon: 'eye-off-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'profile' | 'circle_thread' | 'circle_reply' | 'live_stream' | 'stream_message' | 'profile_board_shoutout';
  targetId: string;
}

function targetLabel(
  targetType: ReportModalProps['targetType'],
): string {
  switch (targetType) {
    case 'circle_thread':
      return 'discussion';
    case 'circle_reply':
      return 'reply';
    case 'live_stream':
      return 'live stream';
    case 'stream_message':
      return 'chat message';
    case 'profile_board_shoutout':
      return 'Pulse Board shoutout';
    default:
      return targetType;
  }
}

/**
 * Report flow — bottom sheet with a pinned submit bar so reason picks and
 * the CTA stay reachable over full-screen feed video.
 */
export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setDetails('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Report submitted', 'Thank you. Our team will review this content.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const sheetMaxHeight = Math.round(windowHeight * 0.78);
  const footerPadBottom = Math.max(insets.bottom, spacing.md);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss report form"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <Pressable
            style={[styles.sheet, { maxHeight: sheetMaxHeight }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Report {targetLabel(targetType)}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close report form"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.dark.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.subtitle}>Why are you reporting this?</Text>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <Pressable
                    key={r.key}
                    style={({ pressed }) => [
                      styles.reasonRow,
                      active ? styles.reasonActive : styles.reasonIdle,
                      pressed ? styles.reasonPressed : null,
                    ]}
                    onPress={() => setReason(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={r.label}
                  >
                    <View style={[styles.reasonIconWrap, active && styles.reasonIconWrapActive]}>
                      <Ionicons
                        name={r.icon as any}
                        size={20}
                        color={active ? colors.primary.teal : colors.dark.textMuted}
                      />
                    </View>
                    <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                      {r.label}
                    </Text>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={active ? colors.primary.teal : colors.dark.textMuted}
                    />
                  </Pressable>
                );
              })}

              {reason ? (
                <AccentComposerFrame
                  accentColor={colors.primary.teal}
                  hint="Additional context (optional)"
                  compact
                  noShadow
                  style={styles.detailsFrame}
                >
                  <TextInput
                    style={[
                      styles.detailsInput,
                      Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : null,
                    ]}
                    placeholder="What should we know?"
                    placeholderTextColor={colors.dark.textMuted}
                    value={details}
                    onChangeText={setDetails}
                    multiline
                    numberOfLines={4}
                    scrollEnabled
                  />
                </AccentComposerFrame>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: footerPadBottom }]}>
              {!reason ? (
                <Text style={styles.footerHint}>Select a reason to continue</Text>
              ) : null}
              <Button
                label="Submit Report"
                variant="destructive"
                size="lg"
                fullWidth
                disabled={!reason}
                loading={submitting}
                onPress={handleSubmit}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const REASON_MIN_HEIGHT = 52;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.dark.text, flex: 1 },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    marginBottom: spacing.sm,
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: REASON_MIN_HEIGHT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  reasonIdle: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reasonActive: {
    backgroundColor: colors.primary.teal + '1A',
    borderWidth: 1,
    borderColor: colors.primary.teal + '88',
  },
  reasonPressed: {
    opacity: 0.88,
  },
  reasonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reasonIconWrapActive: {
    backgroundColor: colors.primary.teal + '22',
  },
  reasonText: {
    flex: 1,
    ...typography.body,
    color: colors.dark.text,
  },
  reasonTextActive: { fontWeight: '700', color: colors.primary.teal },
  detailsFrame: {
    marginTop: spacing.xs,
  },
  detailsInput: {
    ...typography.body,
    color: colors.dark.text,
    minHeight: 96,
    maxHeight: 140,
    paddingVertical: 4,
  },
  footer: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    gap: spacing.sm,
  },
  footerHint: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
});
