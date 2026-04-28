import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import { resolvePicsUrls } from '@/utils/myPulseDisplayType';
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
  onEdit?: (nextContent: string) => Promise<void>;
  editContent?: string;
  wasEdited?: boolean;
}

const SCREEN_W = Dimensions.get('window').width;
/** Card body width (screen - screen padding - rail - card padding). */
const CARD_BODY_W = SCREEN_W - 48;
const GAP = 6;
/** How many thumbs fit across the card body with a 6pt gap. */
const VISIBLE_COUNT = 3;
const THUMB_W = Math.floor((CARD_BODY_W - GAP * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT);

/**
 * Pics = 1..N photo update.
 *   1 photo  → single compact hero (4:3)
 *   2-3      → all thumbs fit inline, no scroll
 *   4+       → horizontal scroll — 3 thumbs fit per page, scroll for more
 * Mock-accurate: thumbnails are small and uniform, and the card stays short
 * so the feed doesn't get dominated by one photo post.
 */
export function MyPulsePicsCard({
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
  const caption = (u.content?.trim() || u.previewText?.trim() || '').slice(0, 280);
  const urls = resolvePicsUrls(u);
  const total = urls.length;

  return (
    <MyPulseCardShell
      displayType="pics"
      timeLabel={relativeMyPulse(u.createdAt)}
      onPress={onPress}
      onDelete={onDelete}
      readOnly={readOnly}
      onLike={onLike}
      onComment={onComment}
      shareMessage={`${caption || 'Photos from my Pulse'} — via PulseVerse`}
      liked={u.liked === true}
      likeCount={u.likeCount ?? 0}
      commentCount={u.commentCount ?? 0}
      isPinned={u.isPinned}
      onTogglePin={onTogglePin}
      onEdit={onEdit}
      editContent={editContent}
      wasEdited={wasEdited}
    >
      {caption ? (
        <CaptionWithMentions
          text={caption}
          style={styles.caption}
          numberOfLines={3}
        />
      ) : null}

      <PicsStrip urls={urls} />

      {total > 1 ? (
        <View style={styles.countChip} pointerEvents="none">
          <Ionicons name="images" size={10} color="#FFF" />
          <Text style={styles.countChipText}>
            {total} photo{total === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}
    </MyPulseCardShell>
  );
}

function PicsStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <View style={[styles.heroSingle, styles.tileEmpty]}>
        <Ionicons name="images-outline" size={26} color={colors.dark.textMuted} />
        <Text style={styles.emptyLabel}>No photos</Text>
      </View>
    );
  }

  if (urls.length === 1) {
    return (
      <View style={styles.heroSingle}>
        <ExpoImage
          source={{ uri: urls[0] }}
          style={styles.fill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
          style={styles.heroScrim}
        />
      </View>
    );
  }

  // 2..N — small square thumbnails. Scrollable only when there are more
  // than VISIBLE_COUNT so short sets don't pick up a scroll indicator.
  const scrollable = urls.length > VISIBLE_COUNT;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={scrollable}
      contentContainerStyle={styles.strip}
    >
      {urls.map((url, idx) => (
        <View
          key={`${url}-${idx}`}
          style={[
            styles.thumb,
            idx > 0 ? { marginLeft: GAP } : null,
          ]}
        >
          <ExpoImage source={{ uri: url }} style={styles.fill} contentFit="cover" />
          {/* subtle inner border so each tile feels distinct */}
          <View style={styles.thumbBorder} pointerEvents="none" />
        </View>
      ))}

      {/* Trailing chevron cue when scrollable */}
      {scrollable ? (
        <View style={styles.scrollHint} pointerEvents="none">
          <Ionicons
            name="chevron-forward"
            size={16}
            color="rgba(255,255,255,0.5)"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.dark.text,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.1,
  },

  heroSingle: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 220,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    position: 'relative',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    pointerEvents: 'none',
  },
  tileEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    position: 'relative',
  },
  thumbBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.18)',
  },
  scrollHint: {
    width: 24,
    height: THUMB_W,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  fill: {
    width: '100%',
    height: '100%',
  },

  countChip: {
    position: 'absolute',
    right: 16,
    top: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(9,14,24,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  countChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
