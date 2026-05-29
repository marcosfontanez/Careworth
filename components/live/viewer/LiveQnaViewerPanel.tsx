import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PulseCard,
  PulseChip,
  PulseEmptyState,
  PulseSectionHeader,
} from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';

type Props = {
  questions: StreamQuestion[];
  pinnedQuestion: StreamQuestion | null;
  viewerUserId?: string;
  broadcastLive: boolean;
  streamIsLive?: boolean;
  submitting?: boolean;
  backendReady?: boolean;
  onSubmit: (question: string) => void;
};

/** Viewer Q&A sheet — submit and browse questions separate from chat. */
export function LiveQnaViewerPanel({
  questions,
  pinnedQuestion,
  viewerUserId,
  broadcastLive,
  streamIsLive = true,
  submitting = false,
  backendReady = true,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState('');

  const canSubmit = streamIsLive && broadcastLive && Boolean(viewerUserId) && !submitting;
  const ended = !streamIsLive;

  const handleSubmit = () => {
    const q = draft.trim();
    if (!q || submitting || !canSubmit) return;
    onSubmit(q);
    setDraft('');
  };

  const recent = questions.filter((q) => q.status !== 'answered').slice(0, 10);

  if (!backendReady) {
    return (
      <PulseEmptyState
        icon="help-circle-outline"
        title="Q&A coming soon"
        message="Apply migration 202 to enable the live question queue. You can still use chat meanwhile."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {pinnedQuestion ? (
        <PulseCard variant="glass">
          <View style={styles.pinnedHeader}>
            <PulseChip label="Pinned by host" tone="premium" icon="pin" />
          </View>
          <Text style={styles.pinnedBody} numberOfLines={4}>
            {pinnedQuestion.question}
          </Text>
          {pinnedQuestion.authorName ? (
            <Text style={styles.pinnedAuthor}>— {pinnedQuestion.authorName}</Text>
          ) : null}
        </PulseCard>
      ) : null}

      {ended ? (
        <PulseCard variant="default">
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={16} color={pulseColors.mutedText} />
            <Text style={styles.noticeTxt}>This stream has ended. New questions are closed.</Text>
          </View>
        </PulseCard>
      ) : !viewerUserId ? (
        <Text style={styles.meta}>Sign in to submit a question.</Text>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={
              broadcastLive ? 'Ask the host a question…' : 'Questions open when the host goes live…'
            }
            placeholderTextColor={pulseColors.mutedText}
            style={styles.input}
            editable={canSubmit}
            maxLength={500}
            multiline
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || !draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!canSubmit || !draft.trim()) && styles.sendDisabled,
              pressed && canSubmit && draft.trim() && styles.sendPressed,
            ]}
            accessibilityLabel="Submit question"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={pulseColors.onAccent} />
            ) : (
              <Ionicons name="send" size={16} color={pulseColors.onAccent} />
            )}
          </Pressable>
        </View>
      )}

      <PulseSectionHeader title="Recent questions" />

      {recent.length === 0 ? (
        <PulseEmptyState
          icon="chatbox-ellipses-outline"
          title="No questions yet"
          message="Be the first to ask — the host can pin one to highlight it on stream."
          style={styles.empty}
        />
      ) : (
        recent.map((q) => (
          <PulseCard key={q.id} variant="default" style={styles.row}>
            <Text style={styles.author}>{q.authorName || 'Viewer'}</Text>
            <Text style={styles.question}>{q.question}</Text>
            {q.status === 'pinned' ? (
              <PulseChip label="Pinned on stream" tone="premium" />
            ) : null}
          </PulseCard>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.md, paddingBottom: pulseSpacing.sm },
  pinnedHeader: { marginBottom: pulseSpacing.sm },
  pinnedBody: { ...pulseTypography.bodySmall, lineHeight: 20 },
  pinnedAuthor: { ...pulseTypography.caption, marginTop: pulseSpacing.xs },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: pulseSpacing.sm },
  noticeTxt: { ...pulseTypography.bodySmall, flex: 1 },
  meta: { ...pulseTypography.bodySmall },
  composer: { flexDirection: 'row', gap: pulseSpacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
    borderRadius: pulseRadius.lg,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: 10,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
    color: pulseColors.text,
    ...pulseTypography.bodySmall,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: pulseRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.teal,
  },
  sendDisabled: { opacity: 0.45 },
  sendPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  empty: { paddingVertical: pulseSpacing.xl },
  row: { gap: pulseSpacing.xs },
  author: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.teal },
  question: { ...pulseTypography.bodySmall, lineHeight: 20 },
});
