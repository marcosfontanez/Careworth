import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing, typography, borderRadius, shadows } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { messagesService, type Conversation } from '@/services/supabase/messages';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/utils/format';

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presenceOnline, setPresenceOnline] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await messagesService.getConversations(user.id);
      setConversations(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadConversations().then(() => setLoading(false));

    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { loadConversations(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => { loadConversations(); }
      )
      .subscribe();

    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(
          Object.values(state).flat().map((p: any) => p.user_id as string)
        );
        setPresenceOnline(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const onlineCount = conversations.filter((c) => presenceOnline.has(c.otherUser.id)).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/feed')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Messages</Text>
          {onlineCount > 0 && (
            <View style={styles.onlineHint}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.onlineHintText}>{onlineCount} online</Text>
            </View>
          )}
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="create-outline" size={22} color={colors.primary.teal} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No messages yet"
          subtitle="Start a conversation from someone's profile."
          ctaLabel="Find people"
          onCtaPress={() => router.push('/search')}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          /** Power users can have hundreds of conversations. */
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
          }
          renderItem={({ item }) => {
            const isOnline = presenceOnline.has(item.otherUser.id);
            return (
              <TouchableOpacity
                style={[styles.row, item.unreadCount > 0 && styles.rowUnread]}
                onPress={() => router.push(`/messages/${item.id}?name=${encodeURIComponent(item.otherUser.displayName)}`)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.otherUser.avatarUrl }} style={styles.avatar} />
                  {isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.body}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}>{item.otherUser.displayName}</Text>
                    {item.otherUser.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                    )}
                    <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
                  </View>
                  <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                    {item.lastMessage ?? 'Start chatting...'}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  titleWrap: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.screenTitle, color: colors.dark.text },
  onlineHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.online },
  onlineHintText: { ...typography.caption, fontSize: 11, fontWeight: '600', color: colors.status.online },
  list: { paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  rowUnread: { backgroundColor: colors.primary.teal + '0A' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.dark.border },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.status.online,
    borderWidth: 2.5, borderColor: colors.dark.bg,
  },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.subtitle, fontSize: 15, fontWeight: '600', color: colors.dark.text, flex: 1 },
  nameUnread: { fontWeight: '800' },
  time: { ...typography.caption, color: colors.dark.textMuted },
  preview: { ...typography.bodySmall, fontSize: 14, color: colors.dark.textMuted, marginTop: 2 },
  previewUnread: { color: colors.dark.text, fontWeight: '600' },
  badge: {
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.full,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
    ...shadows.subtle,
  },
  badgeText: { ...typography.count, fontSize: 11, color: colors.dark.text, fontWeight: '700' },
});
