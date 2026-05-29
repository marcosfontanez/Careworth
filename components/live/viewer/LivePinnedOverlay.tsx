import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import type { StreamPinnedMessage } from '@/types';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';

type CardProps = {
  label: string;
  content: string;
  tone?: 'teal' | 'purple';
  onPress?: () => void;
  onDismiss?: () => void;
  onUnpin?: () => void;
  isHost?: boolean;
};

function LivePinnedOverlayCard({
  label,
  content,
  tone = 'teal',
  onPress,
  onDismiss,
  onUnpin,
  isHost,
}: CardProps) {
  const accent = tone === 'purple' ? '#C4B5FD' : colors.primary.teal;
  const borderColor =
    tone === 'purple' ? 'rgba(167,139,250,0.32)' : 'rgba(56,189,248,0.28)';

  const body = (
    <LinearGradient
      colors={['rgba(15,28,48,0.92)', 'rgba(12,18,32,0.88)']}
      style={[styles.card, { borderColor }]}
    >
      <View style={[styles.iconWell, tone === 'purple' && styles.iconWellPurple]}>
        <Ionicons name="pin" size={14} color={accent} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
        <Text style={styles.content} numberOfLines={2}>
          {content}
        </Text>
      </View>
      {isHost && onUnpin ? (
        <Pressable onPress={onUnpin} style={styles.actionBtn} accessibilityLabel="Unpin">
          <Ionicons name="close" size={16} color={colors.dark.textSecondary} />
        </Pressable>
      ) : onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.actionBtn} accessibilityLabel="Dismiss pin">
          <Ionicons name="close" size={16} color={colors.dark.textSecondary} />
        </Pressable>
      ) : null}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }

  return body;
}

type Props = {
  pinned?: StreamPinnedMessage | null;
  pinnedQuestion?: StreamQuestion | null;
  onDismiss?: () => void;
  onPressChat?: () => void;
  onPressQuestion?: () => void;
  onUnpinChat?: () => void;
  onUnpinQuestion?: () => void;
  isHost?: boolean;
};

/** Premium floating pins for chat + Q&A — compact, stacked, non-blocking. */
export function LivePinnedOverlay({
  pinned,
  pinnedQuestion,
  onDismiss,
  onPressChat,
  onPressQuestion,
  onUnpinChat,
  onUnpinQuestion,
  isHost,
}: Props) {
  const chatContent = pinned?.content?.trim() ?? '';
  const questionContent = pinnedQuestion?.question?.trim() ?? '';
  const hasChat = chatContent.length > 0;
  const hasQuestion = questionContent.length > 0;

  if (!hasChat && !hasQuestion) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {hasQuestion ? (
        <LivePinnedOverlayCard
          label="Pinned Question"
          content={questionContent}
          tone="purple"
          onPress={onPressQuestion}
          onDismiss={onDismiss}
          onUnpin={onUnpinQuestion}
          isHost={isHost}
        />
      ) : null}
      {hasChat ? (
        <LivePinnedOverlayCard
          label="Pinned"
          content={chatContent}
          tone="teal"
          onPress={onPressChat}
          onDismiss={onDismiss}
          onUnpin={onUnpinChat}
          isHost={isHost}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 96,
    left: 12,
    right: 72,
    zIndex: 24,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,14,26,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  iconWellPurple: {
    borderColor: 'rgba(167,139,250,0.28)',
  },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  label: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  content: {
    ...typography.bodySmall,
    color: colors.neutral.white,
    lineHeight: 18,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
