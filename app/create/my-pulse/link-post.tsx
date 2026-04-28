import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { postsService } from '@/services/supabase';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { useToast } from '@/components/ui/Toast';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { profileUpdateKeys, savedPostKeys } from '@/lib/queryKeys';
import { colors, borderRadius, typography, spacing } from '@/theme';
import type { Post } from '@/types';

type Tab = 'mine' | 'saved';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD_H = 18;
const GRID_GAP = 10;
const TILE_W = Math.floor((SCREEN_W - GRID_PAD_H * 2 - GRID_GAP) / 2);
const TILE_H = Math.round(TILE_W * 1.28);

/**
 * Premium My Pulse "Clip" picker: 2-column tile grid with real previews for
 * every post (first-frame video or poster image), tabbed between the viewer's
 * own posts and their saved clips. Selected tile gets an accent halo and a
 * checkmark chip. No cramped list rows, no blank placeholders.
 */
export default function MyPulseLinkPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const [tab, setTab] = useState<Tab>('mine');
  const [selected, setSelected] = useState<Post | null>(null);
  const [intro, setIntro] = useState('');

  const { data: ownPosts = [], isLoading: loadingOwn } = useQuery({
    queryKey: ['myPulseEligiblePosts', user?.id ?? ''],
    queryFn: () => profileUpdatesService.getEligiblePostsForLinking(user!.id),
    enabled: !!user?.id,
  });

  const { data: savedPosts = [], isLoading: loadingSaved } = useQuery({
    queryKey: savedPostKeys.forUser(user?.id),
    queryFn: () => postsService.getSavedPosts(user!.id),
    enabled: !!user?.id && tab === 'saved',
  });

  const list = useMemo<Post[]>(() => {
    if (tab === 'saved') {
      // Only surface saved clips that have media (video or image). Text-only
      // posts don't belong as Clips — they'd show as empty tiles.
      return savedPosts.filter(
        (p) => p.type === 'video' || p.type === 'image' || !!p.mediaUrl?.trim(),
      );
    }
    return ownPosts;
  }, [tab, ownPosts, savedPosts]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!selected) throw new Error('no post');
      const base = intro.trim() || selected.caption.slice(0, 120);
      return profileUpdatesService.add(user.id, {
        type: 'link_post',
        content: base,
        linkedPostId: selected.id,
        previewText: base.slice(0, 160),
      });
    },
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
      }
      showToast('Clip pinned on My Pulse', 'success');
      router.replace('/(tabs)/my-pulse');
    },
  });

  const submit = useCallback(() => {
    if (!selected) return;
    Haptics.selectionAsync().catch(() => undefined);
    mutation.mutate();
  }, [selected, mutation]);

  const pick = useCallback((p: Post) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelected((prev) => (prev?.id === p.id ? null : p));
  }, []);

  const renderTile = useCallback(
    ({ item }: { item: Post }) => {
      const isOn = selected?.id === item.id;
      const isVideo = item.type === 'video' || !!item.mediaUrl?.trim();
      return (
        <TouchableOpacity
          onPress={() => pick(item)}
          activeOpacity={0.82}
          style={[styles.tile, isOn && styles.tileOn]}
        >
          <RecentMediaThumb post={item} style={styles.tileMedia} />

          {/* Bottom gradient for caption legibility over any thumbnail. */}
          <LinearGradient
            colors={['transparent', 'rgba(6,10,18,0.86)']}
            style={styles.tileScrim}
            pointerEvents="none"
          />

          {/* Type corner badge */}
          <View style={styles.tileKindBadge}>
            <Ionicons
              name={isVideo ? 'play' : 'image'}
              size={10}
              color="#FFF"
            />
          </View>

          {/* Selection checkmark */}
          {isOn ? (
            <View style={styles.tileCheck}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          ) : null}

          <Text style={styles.tileCaption} numberOfLines={2}>
            {item.caption?.trim() || '—'}
          </Text>
        </TouchableOpacity>
      );
    },
    [pick, selected],
  );

  if (!user) return <Redirect href="/auth/login" />;

  const isLoading = tab === 'mine' ? loadingOwn : loadingSaved;
  const canSubmit = !!selected && !mutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clip</Text>
        <TouchableOpacity onPress={submit} disabled={!canSubmit} hitSlop={8}>
          <Text style={[styles.postBtn, !canSubmit && styles.postBtnOff]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Pin a PulseVerse clip to your My Pulse. Tap one of your posts or a
        clip you've saved from the feed.
      </Text>

      {/* Optional intro */}
      <MentionAutocomplete
        style={styles.intro}
        placeholder="Add an intro… use @ to tag someone"
        placeholderTextColor={colors.dark.textMuted}
        value={intro}
        onChangeText={setIntro}
        maxLength={120}
      />

      {/* Segmented tab bar — same premium pill style as Media Hub. */}
      <View style={styles.segmented}>
        {(['mine', 'saved'] as Tab[]).map((key) => {
          const active = tab === key;
          const label = key === 'mine' ? 'Your Posts' : 'Saved';
          const count =
            key === 'mine'
              ? ownPosts.length
              : savedPosts.filter(
                  (p) => p.type === 'video' || p.type === 'image' || !!p.mediaUrl?.trim(),
                ).length;
          return (
            <TouchableOpacity
              key={key}
              style={styles.segment}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                setTab(key);
              }}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.segmentInner,
                  active ? styles.segmentInnerActive : null,
                ]}
              >
                <Text
                  style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.segmentCount, active ? styles.segmentCountActive : null]}>
                    <Text
                      style={[
                        styles.segmentCountText,
                        active ? styles.segmentCountTextActive : null,
                      ]}
                    >
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        renderItem={renderTile}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
          gap: GRID_GAP,
        }}
        style={styles.list}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyWrap}>
              <Ionicons
                name={tab === 'mine' ? 'videocam-outline' : 'bookmark-outline'}
                size={30}
                color={colors.dark.textMuted}
              />
              <Text style={styles.empty}>
                {tab === 'mine'
                  ? 'No posts yet — create a video or image post first.'
                  : 'No saved clips yet. Save clips from the feed to pin them here.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: GRID_PAD_H,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text, fontSize: 17 },
  postBtn: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  postBtnOff: { opacity: 0.35 },
  hint: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  intro: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 12,
  },

  /* Segmented control — same pattern as MediaHubSection. */
  segmented: {
    flexDirection: 'row',
    width: '100%',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.md,
    gap: 4,
  },
  segment: { flex: 1, minWidth: 0 },
  segmentInner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  segmentInnerActive: {
    backgroundColor: colors.primary.teal,
    shadowColor: colors.primary.teal,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
  segmentLabelActive: { color: '#FFF', fontWeight: '800' },
  segmentCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCountActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  segmentCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
  },
  segmentCountTextActive: { color: '#FFF' },

  list: { flex: 1 },

  /* Tile grid */
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tileOn: {
    borderColor: colors.primary.teal,
    shadowColor: colors.primary.teal,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 6,
  },
  tileMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  tileScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  tileKindBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.teal,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  tileCaption: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 9,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  empty: {
    fontSize: 13,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
