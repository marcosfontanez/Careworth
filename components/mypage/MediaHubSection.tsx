import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/services/supabase/posts';
import { profileUpdatesService } from '@/services/profileUpdates';
import { useToast } from '@/components/ui/Toast';
import { colors, borderRadius, spacing } from '@/theme';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { trySignedUrlFromPostMediaPublicUrl } from '@/lib/storage';
import { profileUpdateKeys, savedPostKeys } from '@/lib/queryKeys';
import type { Post, ProfileUpdate } from '@/types';

type TabKey = 'recent' | 'favorites' | 'photos';
type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabDef {
  key: TabKey;
  label: string;
  iconActive: IoniconName;
  iconInactive: IoniconName;
}

/**
 * Short, equal-weight labels so the three tabs read as a balanced set and
 * fit comfortably in a segmented pill on 390pt devices.
 */
const TABS: TabDef[] = [
  {
    key: 'recent',
    label: 'Videos',
    iconActive: 'videocam',
    iconInactive: 'videocam-outline',
  },
  {
    key: 'favorites',
    label: 'Favorites',
    iconActive: 'star',
    iconInactive: 'star-outline',
  },
  {
    key: 'photos',
    label: 'Photos',
    iconActive: 'images',
    iconInactive: 'images-outline',
  },
];

interface Props {
  userId: string;
  userPosts: Post[];
  /**
   * My Pulse updates for this user. We use the `pics` updates to surface
   * every uploaded image in Media Hub > Photos, so photos posted via the
   * Pulse composer stay discoverable even though they aren't feed posts.
   */
  profileUpdates?: ProfileUpdate[];
  isOwner: boolean;
  viewAllRoute?: string;
}

/**
 * A single entry rendered in Media Hub. Union type lets us keep feed
 * posts and My Pulse pics side-by-side under one grid without forging
 * synthetic Post objects for the pulse pics.
 */
type MediaHubItem =
  | { kind: 'post'; key: string; post: Post }
  | {
      kind: 'pulse-pic';
      key: string;
      updateId: string;
      imageUrl: string;
      caption: string;
      createdAt: string;
    };

/**
 * Media Hub — a compact personal media library attached to the Pulse Page.
 * Three clearly labeled tabs (Recent Videos, Favorites, My Photos) with
 * live counts, filled-icon active state, scrimmed thumbs, and thoughtful
 * empty states for both owner and visitor views.
 */

export function MediaHubSection({
  userId,
  userPosts,
  profileUpdates,
  isOwner,
  viewAllRoute = '/my-posts',
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [activeTab, setActiveTab] = useState<TabKey>('recent');

  const recentVideos = useMemo<MediaHubItem[]>(
    () =>
      userPosts
        .filter((p) => p.type === 'video')
        .slice(0, 20)
        .map((post) => ({ kind: 'post' as const, key: `post:${post.id}`, post })),
    [userPosts],
  );

  /**
   * Photos list merges:
   * - Image-type feed posts the user has created
   * - Every image URL from their My Pulse `pics` updates
   *
   * We dedupe on URL so a user who re-shares the same image doesn't see
   * duplicate thumbs.
   */
  const photos = useMemo<MediaHubItem[]>(() => {
    const seen = new Set<string>();
    const out: MediaHubItem[] = [];

    for (const post of userPosts) {
      if (post.type !== 'image') continue;
      const url = post.mediaUrl?.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ kind: 'post', key: `post:${post.id}`, post });
    }

    for (const update of profileUpdates ?? []) {
      if (update.type !== 'pics') continue;
      const urls = update.picsUrls ?? [];
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push({
          kind: 'pulse-pic',
          key: `pulse:${update.id}:${i}`,
          updateId: update.id,
          imageUrl: url,
          caption: update.content ?? '',
          createdAt: update.createdAt ?? new Date().toISOString(),
        });
      }
    }

    return out.slice(0, 40);
  }, [userPosts, profileUpdates]);

  /**
   * Keep this query enabled whenever the owner is viewing their hub — not only
   * on the Favorites tab. Otherwise `invalidateQueries` from the feed (save /
   * unsave) uses the default `refetchType: 'active'` and skips **disabled**
   * observers, so the Favorites grid stayed stale until a full remount.
   */
  const favoritesQuery = useQuery<Post[]>({
    queryKey: savedPostKeys.forUser(userId),
    queryFn: () => postsService.getSavedPosts(userId),
    enabled: isOwner,
    staleTime: 30_000,
  });
  const favorites = useMemo<MediaHubItem[]>(
    () =>
      (favoritesQuery.data ?? [])
        .filter((p) => p.type === 'video' || p.type === 'image')
        .slice(0, 20)
        .map((post) => ({
          kind: 'post' as const,
          key: `fav:${post.id}`,
          post,
        })),
    [favoritesQuery.data],
  );

  const counts: Record<TabKey, number> = {
    recent: recentVideos.length,
    favorites: isOwner ? favorites.length : 0,
    photos: photos.length,
  };

  const items: MediaHubItem[] =
    activeTab === 'recent'
      ? recentVideos
      : activeTab === 'favorites'
        ? favorites
        : photos;

  /**
   * Tap → open. Posts route into the feed; pulse-pic items open the
   * parent My Pulse update so the viewer can see the caption and the
   * full gallery for that pin.
   */
  const onOpenItem = useCallback(
    (item: MediaHubItem) => {
      if (item.kind === 'post') {
        router.push(`/feed/${item.post.id}` as any);
      } else {
        router.push(`/my-pulse/${item.updateId}` as any);
      }
    },
    [router],
  );

  /**
   * Delete mutation — routes to the appropriate service based on which
   * tab we're on and what kind of item was selected.
   * - Videos / Photos tab + post item: permanently delete the post
   * - Photos tab + pulse-pic item: delete the parent My Pulse update
   * - Favorites tab: unsave the post (non-destructive)
   */
  const deleteMutation = useMutation({
    mutationFn: async (item: MediaHubItem) => {
      if (activeTab === 'favorites' && item.kind === 'post') {
        await postsService.toggleSave(userId, item.post.id);
        return 'unsaved' as const;
      }
      if (item.kind === 'post') {
        await postsService.deleteOwnPost(item.post.id, userId);
        return 'post-deleted' as const;
      }
      await profileUpdatesService.deleteForUser(item.updateId, userId);
      return 'pulse-deleted' as const;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(userId) });
      queryClient.invalidateQueries({
        queryKey: savedPostKeys.forUser(userId),
        refetchType: 'all',
      });
      const msg =
        result === 'unsaved'
          ? 'Removed from Favorites'
          : result === 'pulse-deleted'
            ? 'Removed from Media Hub'
            : 'Post deleted';
      showToast(msg, 'success');
    },
    onError: () => {
      showToast("Couldn't remove that item", 'error');
    },
  });

  const onLongPressItem = useCallback(
    (item: MediaHubItem) => {
      if (!isOwner) return;

      const isFavoritesTab = activeTab === 'favorites';
      const confirmText = isFavoritesTab
        ? 'Remove from Favorites?'
        : item.kind === 'pulse-pic'
          ? 'Remove this photo from My Pulse?'
          : item.post.type === 'video'
            ? 'Delete this video?'
            : 'Delete this photo?';
      const confirmBody = isFavoritesTab
        ? 'It will be unsaved from your Favorites. The original post stays live.'
        : item.kind === 'pulse-pic'
          ? 'The corresponding My Pulse update will be removed, and the photo disappears from your library.'
          : 'It will be permanently removed from your profile and the feed.';

      Alert.alert(confirmText, confirmBody, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isFavoritesTab ? 'Remove' : 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item),
        },
      ]);
    },
    [activeTab, isOwner, deleteMutation],
  );

  const onViewAll = () => {
    router.push(viewAllRoute as any);
  };

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="film" size={14} color={colors.primary.teal} />
          </View>
          <View>
            <Text style={styles.title}>Media Hub</Text>
            <Text style={styles.subtitle}>Your library at a glance</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="View all media"
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAll}>View all</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary.teal} />
        </TouchableOpacity>
      </View>

      <View style={styles.segmented}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          const count = counts[t.key];
          return (
            // Single TouchableOpacity owns layout AND interaction so
            // there are no Pressable function-as-style quirks.
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={active ? 1 : 0.65}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.segment}
            >
              <View style={styles.segmentContent}>
                <Ionicons
                  name={active ? t.iconActive : t.iconInactive}
                  size={13}
                  color={active ? colors.primary.teal : colors.dark.textMuted}
                />
                <Text
                  style={[
                    styles.segmentLabel,
                    active ? styles.segmentLabelActive : null,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  allowFontScaling={false}
                >
                  {t.label}
                </Text>
                {active && count > 0 ? (
                  <Text
                    style={styles.segmentCountInline}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {count > 99 ? '99+' : count}
                  </Text>
                ) : null}
              </View>
              {/* Underline bar — painted only on the active tab to match
                  the reference mockup's segmented-underline style. */}
              <View
                style={[
                  styles.segmentUnderline,
                  active ? styles.segmentUnderlineActive : null,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {items.length === 0 ? (
        <MediaHubEmpty tab={activeTab} isOwner={isOwner} router={router} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {items.map((item, i) => (
            // Index suffix guards against the rare case where backend data
            // returns the same post id more than once in a single list —
            // without it, React warns about duplicate keys and the strip
            // can miss-update one of the thumbs on re-render.
            <MediaThumbCard
              key={`${item.key}:${i}`}
              item={item}
              canDelete={isOwner}
              isFavoritesTab={activeTab === 'favorites'}
              onPress={() => onOpenItem(item)}
              onLongPress={() => onLongPressItem(item)}
              onRequestDelete={() => onLongPressItem(item)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Thumbnail card for one Media Hub item. Handles both feed posts
 * (via RecentMediaThumb which supports paused-first-frame video) and
 * bare image URLs coming from My Pulse `pics` updates.
 *
 * The small ✕ chip in the top-right is only rendered for owners and
 * long-press on the whole card is an equivalent entry point so touch
 * users on Android (where long-press is the convention) and mouse
 * users who spot the chip both have a path to delete.
 */
function MediaThumbCard({
  item,
  canDelete,
  isFavoritesTab,
  onPress,
  onLongPress,
  onRequestDelete,
}: {
  item: MediaHubItem;
  canDelete: boolean;
  isFavoritesTab: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onRequestDelete: () => void;
}) {
  const isVideo = item.kind === 'post' && item.post.type === 'video';
  const isPulsePic = item.kind === 'pulse-pic';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
    >
      {item.kind === 'post' ? (
        <RecentMediaThumb post={item.post} style={styles.cardImage} />
      ) : (
        <PulsePicThumb imageUrl={item.imageUrl} style={styles.cardImage} />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        style={styles.cardScrim}
        pointerEvents="none"
      />

      {isVideo ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playCircle}>
            <Ionicons name="play" size={14} color="#FFF" />
          </View>
        </View>
      ) : null}

      {/* Top-right delete chip — owner only. Tappable shortcut so users
          don't have to discover the long-press affordance. Styled small
          and translucent so it doesn't fight with the thumb content. */}
      {canDelete ? (
        <TouchableOpacity
          style={styles.deleteChip}
          activeOpacity={0.75}
          hitSlop={8}
          onPress={onRequestDelete}
          accessibilityRole="button"
          accessibilityLabel={isFavoritesTab ? 'Remove from favorites' : 'Delete'}
        >
          <Ionicons name="close" size={12} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.kindBadge} pointerEvents="none">
        <Ionicons
          name={isVideo ? 'videocam' : isPulsePic ? 'heart' : 'image'}
          size={11}
          color="#FFF"
        />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Renders a raw image URL (as used by My Pulse pics) through a signed-URL
 * swap so private storage paths display correctly.
 */
function PulsePicThumb({
  imageUrl,
  style,
}: {
  imageUrl: string;
  style: any;
}) {
  const [displayUri, setDisplayUri] = useState(imageUrl);

  useEffect(() => {
    let alive = true;
    setDisplayUri(imageUrl);
    void trySignedUrlFromPostMediaPublicUrl(imageUrl).then((signed) => {
      if (alive && signed) setDisplayUri(signed);
    });
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  return <Image source={{ uri: displayUri }} style={style} contentFit="cover" />;
}

function MediaHubEmpty({
  tab,
  isOwner,
  router,
}: {
  tab: TabKey;
  isOwner: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  let title = 'Nothing here yet';
  let body = '';
  let icon: IoniconName = 'images-outline';
  let ctaLabel: string | null = null;
  let ctaRoute: string | null = null;

  if (tab === 'recent') {
    icon = 'videocam-outline';
    title = isOwner ? 'No videos yet' : "They haven't posted videos";
    body = isOwner
      ? 'Share a clip with your followers — it will show up here.'
      : 'When they upload videos, you can browse them here.';
    if (isOwner) {
      ctaLabel = 'Post a video';
      ctaRoute = '/create/upload';
    }
  } else if (tab === 'favorites') {
    icon = 'star-outline';
    title = isOwner ? 'No favorites saved' : 'Favorites are private';
    body = isOwner
      ? 'Tap the bookmark on any post to save it to your library.'
      : 'Only the owner can see their saved items.';
  } else {
    icon = 'images-outline';
    title = isOwner ? 'No photos yet' : "They haven't shared photos";
    body = isOwner
      ? 'Add a Pics update from the My Pulse composer to start your photo library.'
      : 'When they share photo updates, they’ll show up here.';
    if (isOwner) {
      ctaLabel = 'Add photos';
      ctaRoute = '/create/my-pulse/pics';
    }
  }

  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary.teal} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {ctaLabel && ctaRoute ? (
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.push(ctaRoute as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={14} color={colors.primary.teal} />
          <Text style={styles.emptyCtaLabel}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const CARD_WIDTH = 118;
const CARD_HEIGHT = 168;

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    letterSpacing: 0.2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAll: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary.teal,
    letterSpacing: 0.2,
  },

  /**
   * Segmented-underline tab control (matches the reference mockup). The
   * track is a rounded, dark-tinted container that stretches to fill the
   * parent's content width. Each tab is a `flex:1 + minWidth:0` segment
   * that paints a 2px teal underline when active.
   */
  segmented: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  /**
   * One of three equal-width tabs in the segmented control. All three
   * share the row evenly via `flex:1 + minWidth:0`. Owns both layout
   * and interaction directly (TouchableOpacity) so nothing gets
   * dropped by a function-as-style layer.
   */
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  segmentLabel: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.1,
  },
  segmentLabelActive: {
    color: colors.primary.teal,
    fontWeight: '800',
  },
  /**
   * Inline count rendered only on the active tab — matches the mockup's
   * compact "(N)" hint so it reads as "Recent Videos 7" without needing
   * a separate badge chip.
   */
  segmentCountInline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.primary.teal,
    fontVariant: ['tabular-nums'],
  },
  /**
   * Thin underline bar sitting below the tab label. We always render
   * the element (so layout doesn't jump between tabs) and only paint
   * it in teal on the active tab.
   */
  segmentUnderline: {
    marginTop: 6,
    height: 2,
    width: 28,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  segmentUnderlineActive: {
    backgroundColor: colors.primary.teal,
  },

  strip: {
    gap: 8,
    paddingBottom: 4,
    paddingRight: 4,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    pointerEvents: 'none',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Small delete/unfavorite chip pinned to the top-right of each thumb.
   * Rendered only for the owner; long-press on the card is an equivalent
   * shortcut. Kept translucent-dark so it never competes with media.
   */
  deleteChip: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  emptyBody: {
    marginTop: 4,
    fontSize: 12,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
  },
  emptyCta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.4)',
  },
  emptyCtaLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.3,
  },
});
