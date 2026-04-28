import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationRow } from '@/components/cards/NotificationRow';
import { FilterChips } from '@/components/ui/FilterChips';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { useNotifications } from '@/hooks/useQueries';
import { notificationService } from '@/services';
import { queryClient } from '@/lib/queryClient';
import { colors, typography, spacing } from '@/theme';
import type { NotificationItem } from '@/types';

function groupByTime(items: any[]) {
  const now = Date.now();
  const hourMs = 3600_000;
  const dayMs = 86400_000;
  const groups: { title: string; data: any[] }[] = [];
  const buckets = { New: [] as any[], Today: [] as any[], 'This Week': [] as any[], Earlier: [] as any[] };

  for (const n of items) {
    const age = now - new Date(n.createdAt).getTime();
    if (age < hourMs) buckets.New.push(n);
    else if (age < dayMs) buckets.Today.push(n);
    else if (age < dayMs * 7) buckets['This Week'].push(n);
    else buckets.Earlier.push(n);
  }

  for (const [title, data] of Object.entries(buckets)) {
    if (data.length > 0) groups.push({ title, data });
  }
  return groups;
}

const FILTERS = ['All', 'Activity', 'Communities'];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = notifications ?? [];

  const filtered = useMemo(() => {
    if (filter === 'Activity') {
      return items.filter((n) =>
        [
          'like',
          'save',
          'share',
          'comment',
          'reply',
          'mention',
          'new_follower',
          'badge_earned',
          'tier_up',
        ].includes(n.type),
      );
    }
    if (filter === 'Communities') return items.filter((n) => n.type === 'community_invite');
    return items;
  }, [items, filter]);

  const sections = useMemo(() => groupByTime(filtered), [filtered]);
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const handleNotificationPress = useCallback(async (notification: NotificationItem) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    if (notification.targetId) {
      if (notification.type === 'comment' || notification.type === 'reply') {
        /* Comments / replies open the thread so the creator can jump in. */
        router.push(`/comments/${notification.targetId}`);
      } else if (
        notification.type === 'like' ||
        notification.type === 'save' ||
        notification.type === 'share'
      ) {
        /* Engagement notifications that don't carry a body open the post
           itself — the creator's first instinct is "what did they react
           to?", not the comments panel. */
        router.push(`/post/${notification.targetId}`);
      } else if (notification.type === 'new_follower') {
        router.push(`/profile/${notification.targetId}`);
      } else if (notification.type === 'mention') {
        // Migration 049 encodes target as `{content_type}:{id}` so we can
        // route each mention to the exact surface it came from.
        const raw = notification.targetId;
        const colon = raw.indexOf(':');
        const kind = colon >= 0 ? raw.slice(0, colon) : '';
        const id = colon >= 0 ? raw.slice(colon + 1) : raw;

        if (kind === 'post' || kind === 'post_comment') {
          router.push(`/post/${id}`);
        } else if (kind === 'profile_update') {
          router.push('/(tabs)/my-pulse');
        } else if (kind === 'circle_thread' || kind === 'circle_reply') {
          // Community-scoped thread route needs the slug. getById's THREAD_SELECT
          // already joins the community record, so we can read it off the row.
          const { circleThreadsDb } = await import('@/services/supabase');
          const thread = await circleThreadsDb.getById(id);
          if (thread?.circleSlug) {
            router.push(`/communities/${thread.circleSlug}/thread/${thread.id}` as any);
          } else {
            router.push('/(tabs)/circles');
          }
        } else {
          // Legacy / unknown payload — fall back to the author's profile.
          const actorId = notification.actor?.id;
          if (actorId) router.push(`/profile/${actorId}`);
        }
      } else if (notification.type === 'community_invite') {
        const { communityService } = await import('@/services');
        const community = await communityService.getById(notification.targetId);
        if (community?.slug) {
          router.push(`/communities/${community.slug}`);
        }
      } else if (notification.type === 'tier_up') {
        // Tier promotions send the recipient to their own profile so the
        // history sheet (tap the pill) is one tap away. We include:
        //   - `openPulseHistory=1` → MyPageContent auto-opens the sheet.
        //   - `tierUp=1`          → the sheet renders the "Share my
        //                            tier" card at the top (growth loop).
        router.push(
          `/profile/${notification.targetId}?openPulseHistory=1&tierUp=1` as any,
        );
      }
    }
  }, [router]);

  const handleMarkAllRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, []);

  if (isLoading) return <LoadingState />;

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Notifications"
        onPressLeft={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
        titleAccessory={
          unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{badgeLabel}</Text>
            </View>
          ) : undefined
        }
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} hitSlop={12}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.filterWrap}>
        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {title === 'New' && <View style={styles.newDot} />}
          </View>
        )}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => handleNotificationPress(item)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="notifications-off-outline"
              title="No notifications yet"
              subtitle="You'll see likes, comments, and community activity here."
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  unreadBadge: {
    backgroundColor: colors.status.error,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: { ...typography.caption, fontWeight: '800', color: colors.dark.text },
  markAllText: { ...typography.sectionLabel, fontWeight: '700', color: colors.primary.teal },
  filterWrap: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  list: { paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  sectionTitle: {
    ...typography.sectionLabel,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.unread },
  emptyWrap: { paddingTop: spacing['4xl'] + spacing.lg, minHeight: 320 },
});
