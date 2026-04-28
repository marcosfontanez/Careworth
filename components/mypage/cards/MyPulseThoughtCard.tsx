import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import type { ProfileUpdate } from '@/types';
import { MyPulseCardShell } from './MyPulseCardShell';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';

interface Props {
  update: ProfileUpdate;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  /** Owner-only pin toggle forwarded to the shared shell menu. */
  onTogglePin?: () => Promise<void> | void;
  /** Owner-only body edit. Present only on the owner's own card. */
  onEdit?: (nextContent: string) => Promise<void>;
  /** Current body to seed the edit sheet. */
  editContent?: string;
  /** True when the server has stamped `editedAt` on this update. */
  wasEdited?: boolean;
}

/**
 * Thought = pure text update. The card is intentionally the cleanest of the
 * four — no media, no preview box. Larger, slightly tighter typography lets
 * the text itself carry the personality; mood appears as a soft tinted chip.
 */
export function MyPulseThoughtCard({
  update: u,
  onDelete,
  onTogglePin,
  readOnly,
  onPress,
  onLike,
  onComment,
  onEdit,
  editContent,
  wasEdited,
}: Props) {
  const text = (u.previewText?.trim() || u.content.trim() || '').slice(0, 500);
  const mood = u.mood?.trim();

  return (
    <MyPulseCardShell
      displayType="thought"
      timeLabel={relativeMyPulse(u.createdAt)}
      onPress={onPress}
      onDelete={onDelete}
      readOnly={readOnly}
      onLike={onLike}
      onComment={onComment}
      shareMessage={`${text} — via PulseVerse`}
      liked={u.liked === true}
      likeCount={u.likeCount ?? 0}
      commentCount={u.commentCount ?? 0}
      isPinned={u.isPinned}
      onTogglePin={onTogglePin}
      onEdit={onEdit}
      editContent={editContent}
      wasEdited={wasEdited}
    >
      <CaptionWithMentions
        text={text}
        style={styles.text}
        numberOfLines={6}
      />
      {mood ? (
        <View style={styles.moodChip}>
          <Text style={styles.moodLabel} numberOfLines={1}>
            {mood}
          </Text>
        </View>
      ) : null}
    </MyPulseCardShell>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  moodChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.30)',
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.teal,
    letterSpacing: 0.2,
  },
});
