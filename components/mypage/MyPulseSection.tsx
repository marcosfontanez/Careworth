import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/theme';
import { profileUpdatesService } from '@/services/profileUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { MyPulseItemCard } from './MyPulseItemCard';
import { MyPulseComposerChips } from './MyPulseComposerChips';
import { profileUpdateKeys } from '@/lib/queryKeys';
import type { Post, ProfileUpdate } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  updates: ProfileUpdate[];
  /** Accent is reserved for future themed overlays; the My Pulse rail uses teal. */
  accent?: string;
  userId: string;
  /** Visitor profile — no add/remove. */
  readOnly?: boolean;
  /** Resolve linked post id → full Post (for thumbnails + paused video frames). */
  resolveLinkedPost?: (postId: string) => Post | undefined;
}

/**
 * The My Pulse section: five-slot rolling feed with a clean header, four
 * type-entry chips (Thought / Clip / Link / Pics), and a stack of
 * type-specific cards. Designed to match the reference mockup exactly.
 */
export function MyPulseSection({
  updates,
  userId,
  readOnly,
  resolveLinkedPost,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const viewerId = authUser?.id ?? null;
  const prevCount = useRef(updates.length);
  const didMount = useRef(false);

  const deleteMut = useMutation({
    mutationFn: (id: string) => profileUpdatesService.deleteForUser(id, userId),
    onSuccess: (_void, deletedId) => {
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(userId) });
      queryClient.removeQueries({ queryKey: profileUpdateKeys.byId(deletedId) });
    },
  });

  /**
   * Optimistic Pulse (like) toggle for cards rendered inside the
   * section. Writes straight to the react-query cache first so the
   * heart fills instantly, then sends to the server and reconciles on
   * settle. If the request fails we roll back — guarantees the UI
   * never gets stuck in a state the server disagrees with.
   *
   * Note: the cache key includes the viewer (`['profileUpdates', userId, viewerId]`)
   * because the `liked` flag is viewer-specific; we re-read it via a
   * `queriesData` match so we pick up the right entry regardless of
   * whether the viewer is signed in or not.
   */
  const likeMut = useMutation({
    mutationFn: (id: string) => profileUpdatesService.toggleLike(id),
    onMutate: async (updateId: string) => {
      await queryClient.cancelQueries({ queryKey: profileUpdateKeys.forUser(userId) });
      const entries = queryClient.getQueriesData<ProfileUpdate[] | undefined>({
        queryKey: profileUpdateKeys.forUser(userId),
      });
      entries.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        queryClient.setQueryData(
          key,
          value.map((row) =>
            row.id === updateId
              ? {
                  ...row,
                  liked: !row.liked,
                  likeCount: Math.max(
                    (row.likeCount ?? 0) + (row.liked ? -1 : 1),
                    0,
                  ),
                }
              : row,
          ),
        );
      });
      return { entries };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.entries?.forEach(([key, value]) => {
        if (value) queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(userId) });
    },
  });

  /**
   * Pin / unpin mutation — a single function that decides which RPC to
   * hit based on the card's current state. We keep the lever inside this
   * component (instead of inside the card) so the react-query cache
   * invalidation happens once centrally and the re-order is immediate.
   */
  const togglePinMut = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      pin ? profileUpdatesService.pin(id) : profileUpdatesService.unpin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(userId) });
    },
  });

  /**
   * Owner-only body edit. We patch every `['profileUpdates', userId, …]`
   * cache entry (React Query keys include the viewer id so there's
   * usually one per viewer) with the new body + a local `editedAt`
   * stamp so the "· edited" tag appears instantly, then reconcile with
   * the server response (authoritative timestamp from the trigger in
   * migration 057). On failure we roll back every patched entry so the
   * feed never gets stuck in an inconsistent state.
   */
  const editMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      profileUpdatesService.updateForUser(id, userId, { content }, viewerId ?? undefined),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: profileUpdateKeys.forUser(userId) });
      const entries = queryClient.getQueriesData<ProfileUpdate[] | undefined>({
        queryKey: profileUpdateKeys.forUser(userId),
      });
      const nowIso = new Date().toISOString();
      entries.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        queryClient.setQueryData(
          key,
          value.map((row) =>
            row.id === id ? { ...row, content, editedAt: nowIso } : row,
          ),
        );
      });
      return { entries };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.entries?.forEach(([key, value]) => {
        if (value) queryClient.setQueryData(key, value);
      });
    },
    onSuccess: (updated) => {
      /**
       * Reconcile: swap our optimistic timestamp for the server's
       * authoritative one + keep the rest of the hydrated row
       * (liked / counts) intact. The single-pulse detail query also
       * has its own cache; invalidate it so a tap-through reads fresh.
       */
      const entries = queryClient.getQueriesData<ProfileUpdate[] | undefined>({
        queryKey: profileUpdateKeys.forUser(userId),
      });
      entries.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        queryClient.setQueryData(
          key,
          value.map((row) =>
            row.id === updated.id
              ? { ...row, content: updated.content, editedAt: updated.editedAt }
              : row,
          ),
        );
      });
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.byId(updated.id) });
    },
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!didMount.current) {
      didMount.current = true;
      prevCount.current = updates.length;
      return;
    }
    if (prevCount.current !== updates.length) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    prevCount.current = updates.length;
  }, [updates.length]);

  const onDelete = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync(id);
    },
    [deleteMut],
  );

  const onTogglePin = useCallback(
    async (id: string, pin: boolean) => {
      await togglePinMut.mutateAsync({ id, pin });
    },
    [togglePinMut],
  );

  /**
   * Pulse / heart handler — gates on sign-in (anonymous visitors get a
   * gentle prompt instead of a silent no-op), fires haptic feedback, and
   * hands off to the optimistic mutation above. Kept in the section so
   * the react-query cache lives in one place per My Pulse surface.
   */
  const onLike = useCallback(
    (id: string) => {
      if (!viewerId) {
        Alert.alert('Sign in', 'You need an account to Pulse this post.');
        return;
      }
      Haptics.selectionAsync().catch(() => {});
      likeMut.mutate(id);
    },
    [viewerId, likeMut],
  );

  /**
   * Comment handler — always routes to the pulse detail view. Even when
   * the update is a pinned feed post we land on the Pulse detail first:
   * it's a more focused surface and its "Open original post" button
   * forwards the user to the real post detail when they actually want
   * to engage the source thread.
   */
  const onComment = useCallback(
    (id: string) => {
      router.push(`/my-pulse/${id}` as any);
    },
    [router],
  );

  /**
   * Body edit — forwarded down to the card, which opens the sheet via
   * `MyPulseCardShell`'s owner menu. Returning the promise lets the
   * sheet keep the user's draft + surface a retry state if the mutate
   * throws.
   */
  const onEdit = useCallback(
    async (id: string, content: string) => {
      await editMut.mutateAsync({ id, content });
    },
    [editMut],
  );

  const count = updates.length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headTitleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="pulse" size={14} color={colors.primary.teal} />
          </View>
          <View style={styles.headTextCol}>
            <Text style={styles.title}>My Pulse</Text>
            <Text style={styles.subtitle}>
              {readOnly
                ? 'Their latest 5 updates. Always fresh.'
                : 'Your latest 5 updates. Always fresh.'}
            </Text>
          </View>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
          <Text style={styles.countTotal}>/5</Text>
        </View>
      </View>

      <MyPulseComposerChips isOwner={!readOnly} />

      {!count ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="sparkles"
              size={22}
              color={colors.primary.teal}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {readOnly ? 'Quiet on their Pulse.' : "What's on your Pulse?"}
          </Text>
          <Text style={styles.emptyBody}>
            {readOnly
              ? 'When they share a thought, clip, link, or photo it will show up here.'
              : 'Share a thought, clip, link, or photo. Your latest five stay fresh here.'}
          </Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {updates.map((u) => (
            <MyPulseItemCard
              key={u.id}
              update={u}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onEdit={readOnly ? undefined : onEdit}
              onLike={onLike}
              onComment={onComment}
              readOnly={readOnly}
              resolveLinkedPost={resolveLinkedPost}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
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
  headTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.dark.textMuted,
    letterSpacing: 0.15,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
    marginLeft: spacing.sm,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.teal,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  countTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(20,184,166,0.65)',
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.elevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
    backgroundColor: 'rgba(20,184,166,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 12.5,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  stack: {
    marginTop: 2,
  },
});
