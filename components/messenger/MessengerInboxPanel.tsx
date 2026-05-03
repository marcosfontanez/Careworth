import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing, typography, borderRadius, shadows } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FilterChips } from '@/components/ui/FilterChips';
import { useToast } from '@/components/ui/Toast';
import { messagesService, type Conversation } from '@/services/supabase/messages';
import { timeAgo } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';

export type MessengerSortMode = 'recent' | 'unread' | 'name';

const SORT_OPTIONS: MessengerSortMode[] = ['recent', 'unread', 'name'];
const SORT_LABELS: Record<MessengerSortMode, string> = {
  recent: 'Recent',
  unread: 'Unread first',
  name: 'Name A–Z',
};

function sortConversations(list: Conversation[], mode: MessengerSortMode): Conversation[] {
  const copy = [...list];
  if (mode === 'recent') {
    copy.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
    return copy;
  }
  if (mode === 'unread') {
    copy.sort((a, b) => {
      const ud = b.unreadCount - a.unreadCount;
      if (ud !== 0) return ud;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
    return copy;
  }
  copy.sort((a, b) =>
    a.otherUser.displayName.localeCompare(b.otherUser.displayName, undefined, {
      sensitivity: 'base',
    }),
  );
  return copy;
}

type Props = {
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  presenceOnline: Set<string>;
  /** When a thread is removed locally after delete/block (optional UI snap). */
  onRemoved?: (conversationId: string) => void;
};

export function MessengerInboxPanel({
  conversations,
  loading,
  refreshing,
  onRefresh,
  presenceOnline,
  onRemoved,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const [sort, setSort] = useState<MessengerSortMode>('recent');

  const sorted = useMemo(
    () => sortConversations(conversations, sort),
    [conversations, sort],
  );

  const openThread = useCallback(
    (item: Conversation) => {
      router.push(
        `/messages/${item.id}?name=${encodeURIComponent(item.otherUser.displayName)}` as any,
      );
    },
    [router],
  );

  const confirmDelete = useCallback(
    (item: Conversation) => {
      Alert.alert(
        'Delete conversation?',
        'This removes the message history for both you and '
          + `${item.otherUser.displayName}. This can’t be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await messagesService.deleteConversation(item.id);
                onRemoved?.(item.id);
                toast.show('Conversation deleted', 'success');
              } catch (e: any) {
                toast.show(e?.message ?? 'Could not delete conversation', 'error');
              }
            },
          },
        ],
      );
    },
    [onRemoved, toast],
  );

  const confirmBlock = useCallback(
    (item: Conversation) => {
      if (!authUser?.id) return;
      Alert.alert(
        `Block ${item.otherUser.displayName}?`,
        'They won’t be able to message you. This conversation will be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await messagesService.blockUserAndOptionalDeleteConversation(
                  authUser.id,
                  item.otherUser.id,
                  { conversationId: item.id },
                );
                onRemoved?.(item.id);
                toast.show('User blocked', 'success');
              } catch (e: any) {
                toast.show(e?.message ?? 'Could not block user', 'error');
              }
            },
          },
        ],
      );
    },
    [authUser?.id, onRemoved, toast],
  );

  const openRowMenu = useCallback(
    (item: Conversation) => {
      Alert.alert(
        item.otherUser.displayName,
        'Conversation options',
        [
          {
            text: 'Open chat',
            onPress: () => openThread(item),
          },
          {
            text: 'View profile',
            onPress: () => router.push(`/profile/${item.otherUser.id}` as any),
          },
          {
            text: 'Delete conversation',
            style: 'destructive',
            onPress: () => confirmDelete(item),
          },
          {
            text: 'Block & remove',
            style: 'destructive',
            onPress: () => confirmBlock(item),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true },
      );
    },
    [confirmBlock, confirmDelete, openThread, router],
  );

  if (loading) {
    return <LoadingState />;
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyOuter}>
        <EmptyState
          icon="chatbubbles-outline"
          title="No messages yet"
          subtitle="Start a conversation from someone's profile."
          ctaLabel="Find people"
          onCtaPress={() => router.push('/search' as any)}
        />
      </View>
    );
  }

  const sortChips = SORT_OPTIONS.map((k) => SORT_LABELS[k]);

  return (
    <View style={styles.flex}>
      <View style={styles.sortWrap}>
        <FilterChips
          options={sortChips}
          selected={SORT_LABELS[sort]}
          onSelect={(label) => {
            const entry = SORT_OPTIONS.find((k) => SORT_LABELS[k] === label);
            if (entry) setSort(entry);
          }}
        />
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary.teal}
          />
        }
        renderItem={({ item }) => {
          const isOnline = presenceOnline.has(item.otherUser.id);
          return (
            <View style={[styles.row, item.unreadCount > 0 && styles.rowUnread]}>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() => openThread(item)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.otherUser.avatarUrl }} style={styles.avatar} />
                  {isOnline ? <View style={styles.onlineDot} /> : null}
                </View>
                <View style={styles.body}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}
                      numberOfLines={1}
                    >
                      {item.otherUser.displayName}
                    </Text>
                    {item.otherUser.isVerified ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                    ) : null}
                    <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
                  </View>
                  <Text
                    style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.lastMessage ?? 'Start chatting…'}
                  </Text>
                </View>
                {item.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                ) : (
                  <View style={styles.badgePlaceholder} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openRowMenu(item)}
                style={styles.moreBtn}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                accessibilityLabel="Conversation options"
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sortWrap: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  emptyOuter: { flex: 1, paddingTop: spacing['3xl'] },
  list: { paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  rowUnread: { backgroundColor: colors.primary.teal + '0A' },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md - 2,
    minWidth: 0,
  },
  moreBtn: { paddingRight: layout.screenPadding, paddingVertical: spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.status.online,
    borderWidth: 2.5,
    borderColor: colors.dark.bg,
  },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.text,
    flex: 1,
    minWidth: 0,
  },
  nameUnread: { fontWeight: '800' },
  time: { ...typography.caption, color: colors.dark.textMuted, flexShrink: 0 },
  preview: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  previewUnread: { color: colors.dark.text, fontWeight: '600' },
  badge: {
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    ...shadows.subtle,
    flexShrink: 0,
  },
  badgeText: { ...typography.count, fontSize: 11, color: colors.dark.text, fontWeight: '700' },
  badgePlaceholder: { width: 8, flexShrink: 0 },
});
