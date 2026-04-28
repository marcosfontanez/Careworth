import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import type { Post, ProfileUpdate } from '@/types';
import { MyPulseCardShell } from './MyPulseCardShell';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { postStaticImagePreviewUri } from '@/utils/postPreviewMedia';

interface Props {
  update: ProfileUpdate;
  /** Static thumbnail URL (mediaThumb on the profile update itself). */
  thumbnail?: string;
  /**
   * Full linked Post when the clip references an in-feed post. Lets the
   * card show a paused first-frame preview for videos (via RecentMediaThumb)
   * when no static thumbnail was uploaded.
   */
  linkedPost?: Post;
  /** Headline displayed under the thumbnail row (post caption / live title). */
  title?: string;
  /** Source kicker e.g. "From Feed" · "Saved Clip". */
  sourceLabel?: string;
  /** Optional engagement tags shown inline (likes / comments on the clip). */
  engagementSummary?: { likes?: number; comments?: number };
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  /** Owner-only pin toggle forwarded to the shared shell menu. */
  onTogglePin?: () => Promise<void> | void;
}

const CLIP_ACCENT = '#60A5FA';

/**
 * Clip = internal PulseVerse content (user's own clip, a saved feed clip, a
 * linked live, or a linked circle thread). The thumbnail wears a PulseVerse
 * source pill ("From Feed" / "Saved Clip" / "From Live") so visitors know
 * the content lives inside the app — not an external video link.
 */
export function MyPulseClipCard({
  update: u,
  thumbnail,
  linkedPost,
  title,
  sourceLabel = 'From Feed',
  engagementSummary,
  onDelete,
  onTogglePin,
  readOnly,
  onPress,
  onLike,
  onComment,
}: Props) {
  const caption = (u.previewText?.trim() || u.content.trim() || '').slice(0, 240);
  const headline = title?.trim() || caption || 'PulseVerse clip';
  const likes = engagementSummary?.likes ?? 0;
  const comments = engagementSummary?.comments ?? 0;
  /**
   * Action-row shell counts mirror the original post's engagement (when we
   * can resolve it) so the pin card reads as a window onto the real feed
   * post — tapping Pulse / Comment then routes into `/post/[id]` where the
   * user can actually engage. Without this sync the shell shows `0 / 0`
   * on fresh pins and it looks like a brand-new, never-engaged post.
   */
  const shellLikeCount =
    engagementSummary?.likes ?? u.likeCount ?? 0;
  const shellCommentCount =
    engagementSummary?.comments ?? u.commentCount ?? 0;

  // Prefer an explicit thumbnail; else a static image preview from the
  // linked post; else fall through to RecentMediaThumb which pauses on the
  // first video frame when the post is a video.
  const staticThumb =
    thumbnail?.trim() ||
    (linkedPost ? postStaticImagePreviewUri(linkedPost) : undefined);
  const showVideoPreview =
    !staticThumb && linkedPost?.type === 'video' && !!linkedPost.mediaUrl;

  return (
    <MyPulseCardShell
      displayType="clip"
      timeLabel={relativeMyPulse(u.createdAt)}
      onPress={onPress}
      onDelete={onDelete}
      readOnly={readOnly}
      onLike={onLike}
      onComment={onComment}
      shareMessage={`${headline} — via PulseVerse`}
      liked={u.liked === true}
      likeCount={shellLikeCount}
      commentCount={shellCommentCount}
      isPinned={u.isPinned}
      onTogglePin={onTogglePin}
    >
      {caption && caption !== headline ? (
        <CaptionWithMentions
          text={caption}
          style={styles.caption}
          numberOfLines={2}
        />
      ) : null}

      <View style={styles.mediaRow}>
        <View style={styles.thumbWrap}>
          {staticThumb ? (
            <ExpoImage
              source={{ uri: staticThumb }}
              style={styles.thumb}
              contentFit="cover"
            />
          ) : showVideoPreview && linkedPost ? (
            <RecentMediaThumb post={linkedPost} style={styles.thumb} />
          ) : (
            <LinearGradient
              colors={['rgba(96,165,250,0.22)', 'rgba(96,165,250,0.05)']}
              style={[styles.thumb, styles.thumbEmpty]}
            >
              <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          )}

          {/* Gradient scrim for legibility of overlays */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            style={styles.scrim}
          />

          {/* Centered play affordance — the key "this is a video" cue */}
          <View style={styles.playCenter}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={16} color="#FFF" />
            </View>
          </View>

          {/* PulseVerse source pill pinned to the bottom-left of the thumb */}
          <View style={styles.sourcePill}>
            <Ionicons
              name="pulse"
              size={9}
              color={CLIP_ACCENT}
              style={styles.sourceIcon}
            />
            <Text style={styles.sourcePillLabel} numberOfLines={1}>
              {sourceLabel}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={3}>
            {headline}
          </Text>

          {likes > 0 || comments > 0 ? (
            <View style={styles.engageRow}>
              {likes > 0 ? (
                <View style={styles.engageItem}>
                  <Ionicons
                    name="heart"
                    size={11}
                    color="#FF2D92"
                  />
                  <Text style={styles.engageValue}>
                    {formatCompact(likes)}
                  </Text>
                </View>
              ) : null}
              {comments > 0 ? (
                <View style={styles.engageItem}>
                  <Ionicons
                    name="chatbubble"
                    size={10}
                    color={colors.dark.textMuted}
                  />
                  <Text style={styles.engageValue}>
                    {formatCompact(comments)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.placeholderMeta}>
              PulseVerse feed clip
            </Text>
          )}
        </View>
      </View>
    </MyPulseCardShell>
  );
}

function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1_000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textSecondary,
    marginBottom: 10,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbWrap: {
    width: 124,
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.18)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    pointerEvents: 'none',
  },
  playCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sourcePill: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(9,14,24,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.45)',
    maxWidth: 110,
  },
  sourceIcon: {
    marginLeft: -1,
  },
  sourcePillLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  meta: {
    flex: 1,
    paddingTop: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  engageRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  engageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engageValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  placeholderMeta: {
    marginTop: 10,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
