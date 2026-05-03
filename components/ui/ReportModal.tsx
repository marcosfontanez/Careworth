import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

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
  targetType: 'post' | 'comment' | 'profile' | 'circle_thread';
  targetId: string;
}

/**
 * Report flow — previously a white sheet in an otherwise dark app. Now
 * matches the rest of the product's bottom-sheet language (dark card
 * surface, `typography` tokens, `borderRadius.sheet`, shared Button
 * primitive for the submit CTA). Behaviour and copy unchanged.
 */
export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setReason(null);
      setDetails('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              Report{' '}
              {targetType === 'circle_thread' ? 'discussion' : targetType}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Why are you reporting this?</Text>

          {REASONS.map((r) => {
            const active = reason === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.reasonRow, active && styles.reasonActive]}
                onPress={() => setReason(r.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={r.icon as any}
                  size={20}
                  color={active ? colors.primary.teal : colors.dark.textMuted}
                />
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                  {r.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary.teal} />
                )}
              </TouchableOpacity>
            );
          })}

          {reason && (
            <TextInput
              style={styles.detailsInput}
              placeholder="Additional details (optional)"
              placeholderTextColor={colors.dark.textMuted}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
            />
          )}

          <Button
            label="Submit Report"
            variant="destructive"
            size="lg"
            fullWidth
            disabled={!reason}
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submit}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.h3, color: colors.dark.text },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    marginBottom: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  reasonActive: {
    backgroundColor: colors.primary.teal + '1A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary.teal + '66',
  },
  reasonText: {
    flex: 1,
    ...typography.body,
    color: colors.dark.text,
  },
  reasonTextActive: { fontWeight: '700', color: colors.primary.teal },
  detailsInput: {
    backgroundColor: colors.dark.cardAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.dark.text,
    marginTop: spacing.sm,
    height: 90,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
