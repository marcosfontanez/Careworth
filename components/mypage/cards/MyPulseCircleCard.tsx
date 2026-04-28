import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import type { ProfileUpdate } from '@/types';
import { MyPulseCardShell } from './MyPulseCardShell';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { CirclesOrbitIcon } from './icons/CirclesOrbitIcon';

/** Must match the `circle` entry in MY_PULSE_VISUALS. */
const CIRCLE_ACCENT = '#F472B6';

interface Props {
  update: ProfileUpdate;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  /** Owner-only pin toggle forwarded to the shared shell menu. */
  onTogglePin?: () => Promise<void> | void;
}

/**
 * Circle Discussion = a Circles thread the owner pinned to their Pulse.
 *
 * Unlike Clip (which previews a feed VIDEO), a Circle discussion is
 * text-first: it has a title (the thread title), a preview of the body,
 * and a "from <circle>" source line so visitors know which Circle the
 * conversation came from. No video thumbnail, no play button — tapping
 * the card routes back into the original Circles thread where the
 * discussion lives.
 *
 * Visual identity (rose-pink accent, "Circle Discussion" pill, chatbubbles
 * glyph) lives in `MY_PULSE_VISUALS.circle` on the shared shell so the
 * color stays in sync with the composer / type-badge elsewhere in the app.
 */
export function MyPulseCircleCard({
  update: u,
  onDelete,
  onTogglePin,
  readOnly,
  onPress,
  onLike,
  onComment,
}: Props) {
  const rawTitle =
    u.linkedDiscussionTitle?.trim() ||
    u.content.split('—')[0]?.trim() ||
    u.content.trim();
  const title = rawTitle.slice(0, 140) || 'Circle discussion';
  const preview = (u.previewText?.trim() || '').slice(0, 260);
  const circleSlug = u.linkedCircleSlug?.trim();
  // Human-friendly circle name: "night-shift-nurses" → "Night Shift Nurses".
  const circleLabel = circleSlug
    ? circleSlug
        .split(/[-_]/g)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';

  return (
    <MyPulseCardShell
      displayType="circle"
      timeLabel={relativeMyPulse(u.createdAt)}
      onPress={onPress}
      onDelete={onDelete}
      readOnly={readOnly}
      onLike={onLike}
      onComment={onComment}
      shareMessage={`${title} — via PulseVerse Circles`}
      liked={u.liked === true}
      likeCount={u.likeCount ?? 0}
      commentCount={u.commentCount ?? 0}
      isPinned={u.isPinned}
      onTogglePin={onTogglePin}
    >
      {circleLabel ? (
        <View style={styles.sourceRow}>
          <CirclesOrbitIcon size={14} color={CIRCLE_ACCENT} />
          <Text style={styles.sourceLabel} numberOfLines={1}>
            from {circleLabel}
          </Text>
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={3}>
        {title}
      </Text>

      {preview && preview !== title ? (
        <View style={styles.quoteBlock}>
          <View style={styles.quoteBar} />
          <CaptionWithMentions
            text={preview}
            style={styles.quoteText}
            numberOfLines={4}
          />
        </View>
      ) : null}
    </MyPulseCardShell>
  );
}

const styles = StyleSheet.create({
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  sourceLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CIRCLE_ACCENT,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  quoteBlock: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  quoteBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: 'rgba(244,114,182,0.55)',
  },
  quoteText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    fontStyle: 'italic',
    letterSpacing: -0.1,
  },
  emptyHint: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  openLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: CIRCLE_ACCENT,
    letterSpacing: 0.3,
  },
});
