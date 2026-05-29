import React, { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import { LiveManagerEmptyState } from '@/components/live/studio/StreamManagerPanelShell';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';

type Props = {
  questions: StreamQuestion[];
  pinnedQuestion: StreamQuestion | null;
  loading?: boolean;
  backendReady?: boolean;
  onPin: (questionId: string) => void;
  onUnpin: (questionId: string) => void;
  onMarkAnswered: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
};

function StatusChip({ label, tone }: { label: string; tone: 'teal' | 'purple' | 'muted' }) {
  const toneStyle =
    tone === 'purple'
      ? styles.chipPurple
      : tone === 'teal'
        ? styles.chipTeal
        : styles.chipMuted;
  return (
    <View style={[styles.chip, toneStyle]}>
      <Text style={styles.chipTxt}>{label}</Text>
    </View>
  );
}

/** Host Q&A queue — pin, unpin, and mark answered. */
export function LiveQnaHostPanel({
  questions,
  pinnedQuestion,
  loading = false,
  backendReady = true,
  onPin,
  onUnpin,
  onMarkAnswered,
  onDismiss,
}: Props) {
  const actionLockRef = useRef(false);

  const withLock = (fn: () => void) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      fn();
    } finally {
      setTimeout(() => {
        actionLockRef.current = false;
      }, 400);
    }
  };

  if (!backendReady) {
    return (
      <LiveManagerEmptyState
        icon="help-circle-outline"
        title="Q&A requires migration 202"
        message="Run supabase/migrations/202_live_qna_scene_mode.sql to enable the question queue."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary.teal} />
      </View>
    );
  }

  const queued = questions.filter((q) => q.status === 'queued');
  const answered = questions.filter((q) => q.status === 'answered').slice(0, 8);

  return (
    <View style={styles.wrap}>
      {pinnedQuestion ? (
        <View style={styles.pinned}>
          <View style={styles.pinnedHeader}>
            <StatusChip label="Pinned Question" tone="purple" />
            <Text style={styles.pinnedAuthor}>{pinnedQuestion.authorName || 'Viewer'}</Text>
          </View>
          <Text style={styles.pinnedBody}>{pinnedQuestion.question}</Text>
          <View style={styles.rowActions}>
            <Pressable
              onPress={() => withLock(() => onUnpin(pinnedQuestion.id))}
              style={styles.actionBtn}
            >
              <Ionicons name="pin-outline" size={16} color="#C4B5FD" />
              <Text style={styles.actionTxtPurple}>Unpin</Text>
            </Pressable>
            <Pressable
              onPress={() => withLock(() => onMarkAnswered(pinnedQuestion.id))}
              style={styles.actionBtn}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary.teal} />
              <Text style={styles.actionTxt}>Mark answered</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Waiting ({queued.length})</Text>
      {queued.length === 0 ? (
        <LiveManagerEmptyState
          icon="help-circle-outline"
          title="No questions in queue"
          message="Viewers submit from the Q&A sheet. Pin one to highlight it on stream."
        />
      ) : (
        queued.map((q) => (
          <View key={q.id} style={styles.row}>
            <View style={styles.rowText}>
              <View style={styles.rowMeta}>
                <Text style={styles.author}>{q.authorName || 'Viewer'}</Text>
                <StatusChip label="Queued" tone="teal" />
              </View>
              <Text style={styles.question}>{q.question}</Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => withLock(() => onPin(q.id))} style={styles.iconBtn}>
                <Ionicons name="pin-outline" size={18} color={colors.primary.teal} />
              </Pressable>
              <Pressable onPress={() => withLock(() => onMarkAnswered(q.id))} style={styles.iconBtn}>
                <Ionicons name="checkmark-outline" size={18} color={colors.primary.teal} />
              </Pressable>
              <Pressable onPress={() => withLock(() => onDismiss(q.id))} style={styles.iconBtn}>
                <Ionicons name="close-outline" size={18} color={colors.dark.textMuted} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      {answered.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Answered</Text>
          {answered.map((q) => (
            <View key={q.id} style={[styles.row, styles.rowAnswered]}>
              <View style={styles.rowText}>
                <View style={styles.rowMeta}>
                  <Text style={styles.authorMuted}>{q.authorName || 'Viewer'}</Text>
                  <StatusChip label="Answered" tone="muted" />
                </View>
                <Text style={styles.questionMuted}>{q.question}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 8 },
  loading: { paddingVertical: 32, alignItems: 'center' },
  pinned: {
    padding: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(46,16,101,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    gap: 8,
  },
  pinnedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinnedAuthor: { ...typography.caption, fontWeight: '700', color: colors.primary.teal },
  pinnedBody: { ...typography.body, color: colors.neutral.white, lineHeight: 22 },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowAnswered: { opacity: 0.72 },
  rowText: { flex: 1, gap: 6 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  author: { ...typography.caption, fontWeight: '800', color: colors.primary.teal },
  authorMuted: { ...typography.caption, fontWeight: '700', color: colors.dark.textMuted },
  question: { ...typography.bodySmall, color: colors.neutral.white, lineHeight: 20 },
  questionMuted: { ...typography.bodySmall, color: colors.dark.textSecondary, lineHeight: 20 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionTxt: { ...typography.caption, fontWeight: '700', color: colors.primary.teal },
  actionTxtPurple: { ...typography.caption, fontWeight: '700', color: '#C4B5FD' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,14,26,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipTeal: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderColor: 'rgba(34,211,238,0.28)',
  },
  chipPurple: {
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderColor: 'rgba(167,139,250,0.32)',
  },
  chipMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipTxt: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    color: colors.neutral.white,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
