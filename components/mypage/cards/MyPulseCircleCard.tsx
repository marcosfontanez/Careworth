import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { formatCount, relativeMyPulse } from '@/utils/format';
import type { Post, ProfileUpdate } from '@/types';
import { MyPulseCardShell } from './MyPulseCardShell';
import { communitiesService } from '@/services/supabase';
import { feedService } from '@/services/feed';

function thumbFromPost(post: Post | null | undefined): string | null {
  if (!post) return null;
  return (
    post.thumbnailUrl?.trim() ||
    post.coverAltUrl?.trim() ||
    (post.type === 'image' ? post.mediaUrl?.trim() : null) ||
    null
  );
}

const ACCENT = colors.primary.teal;

interface Props {
  update: ProfileUpdate;
  /** Thumbnail from the linked feed post (when the pin references `linkedPostId`). */
  linkedPostMediaUrl?: string | null;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onTogglePin?: () => Promise<void> | void;
}

/**
 * Circles discussion pin — horizontal mock layout: round room preview,
 * title, blurb, like + member counts, chevron into the thread.
 */
export function MyPulseCircleCard({
  update: u,
  linkedPostMediaUrl,
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
  const circleSlug = u.linkedCircleSlug?.trim();
  const preview = (u.previewText?.trim() || '').slice(0, 220);
  const linkedPostId = u.linkedPostId?.trim();

  const { data: circleMeta } = useQuery({
    queryKey: ['community', 'preview', circleSlug],
    queryFn: () => communitiesService.getBySlug(circleSlug!),
    enabled: !!circleSlug,
    staleTime: 300_000,
  });

  const needFetchedThumb =
    !!linkedPostId && !u.mediaThumb?.trim() && !linkedPostMediaUrl?.trim();

  const { data: fetchedPost } = useQuery({
    queryKey: ['post', 'circlePinThumb', linkedPostId],
    queryFn: () => feedService.getPostById(linkedPostId!, null),
    enabled: !!linkedPostId && needFetchedThumb,
    staleTime: 120_000,
  });

  const description =
    (circleMeta?.description?.trim() && circleMeta.description.trim().slice(0, 160)) ||
    preview ||
    '';
  const pinThumb =
    u.mediaThumb?.trim() || linkedPostMediaUrl?.trim() || thumbFromPost(fetchedPost) || null;
  const previewUri = pinThumb || circleMeta?.bannerUrl?.trim() || null;
  const memberCount = circleMeta?.memberCount;
  const showFeatured = circleMeta?.featuredOrder != null;

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
      <View style={styles.circleRow}>
        <View style={styles.previewRing}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImg} contentFit="cover" />
          ) : (
            <View style={styles.previewFallback}>
              <Ionicons name="people" size={28} color={`${ACCENT}99`} />
            </View>
          )}
        </View>

        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {showFeatured ? (
              <Ionicons name="checkmark-circle" size={17} color={ACCENT} style={styles.verify} />
            ) : null}
          </View>
          {description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={13} color={ACCENT} />
              <Text style={styles.statText}>{formatCount(u.likeCount ?? 0)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={14} color={colors.dark.textMuted} />
              <Text style={styles.statText} numberOfLines={1}>
                {typeof memberCount === 'number' && memberCount >= 0
                  ? `${formatCount(memberCount)} members`
                  : 'Circle'}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} style={styles.chevron} />
      </View>
    </MyPulseCardShell>
  );
}

const PREVIEW = 56;

const styles = StyleSheet.create({
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  previewRing: {
    width: PREVIEW,
    height: PREVIEW,
    borderRadius: PREVIEW / 2,
    borderWidth: 2,
    borderColor: `${ACCENT}44`,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,24,0.9)',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  verify: {
    marginTop: 1,
  },
  desc: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    color: colors.dark.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.dark.textMuted,
    opacity: 0.5,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.1,
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 2,
  },
});
