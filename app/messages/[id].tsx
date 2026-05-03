import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, iconSize, layout, spacing, touchTarget, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { messagesService, type Message } from '@/services/supabase/messages';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/utils/format';
import { LinkPreview, extractUrls } from '@/components/chat/LinkPreview';

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingWrap}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    let cancelled = false;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: convo } = await supabase.from('conversations').select('id').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (!convo) {
        toast.show('This chat isn’t available. You may have blocked each other.', 'error');
        setLoading(false);
        if (router.canGoBack()) router.back();
        else router.replace('/messages');
        return;
      }

      const msgs = await messagesService.getMessages(id);
      if (cancelled) return;
      setMessages(msgs);
      setLoading(false);

      void messagesService.markAsRead(id, user.id);

      if (cancelled) return;
      const channel = supabase.channel(`chat:${id}`);
      if (cancelled) {
        supabase.removeChannel(channel);
        return;
      }
      realtimeChannel = channel;
      channelRef.current = channel;

      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            const msg = payload.new as any;
            setMessages((prev) => [
              {
                id: msg.id,
                conversationId: msg.conversation_id,
                senderId: msg.sender_id,
                content: msg.content,
                read: msg.read,
                createdAt: msg.created_at,
              },
              ...prev,
            ]);
            if (msg.sender_id !== user.id) {
              messagesService.markAsRead(id, user.id);
              setOtherTyping(false);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            const updated = payload.new as any;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, read: updated.read } : m)));
          }
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const others = Object.values(state)
            .flat()
            .filter((p: any) => p.user_id !== user.id && p.typing);
          setOtherTyping(others.length > 0);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, typing: false });
          }
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };
  }, [id, user, router, toast]);

  const broadcastTyping = useCallback(() => {
    if (!id || !user || !channelRef.current) return;
    channelRef.current.track({ user_id: user.id, typing: true });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.track({ user_id: user.id, typing: false });
      }
    }, 2000);
  }, [id, user]);

  const handleSend = async () => {
    if (!text.trim() || !user || !id) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await messagesService.sendMessage(id, user.id, content);
    } catch (e: any) {
      toast.show(e?.message ?? 'Could not send message', 'error');
    }
    setSending(false);
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === user?.id;
      const urls = extractUrls(item.content);
      return (
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          {urls.length > 0 && <LinkPreview url={urls[0]} />}
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{timeAgo(item.createdAt)}</Text>
            {isMe && (
              <Ionicons
                name={item.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.read ? colors.primary.teal : 'rgba(255,255,255,0.55)'}
              />
            )}
          </View>
        </View>
      );
    },
    [user]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))}
          activeOpacity={0.7}
          style={styles.headerHit}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={iconSize.lg} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {name ?? 'Chat'}
          </Text>
          {otherTyping && <Text style={styles.typingLabel}>typing...</Text>}
        </View>
        <View style={styles.headerHit} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary.teal} style={styles.loader} />
      ) : (
        <FlatList
          ref={listRef}
          style={styles.listFlex}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={otherTyping ? <TypingIndicator /> : null}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => {
            setText(t);
            broadcastTyping();
          }}
          placeholder="Type a message..."
          placeholderTextColor={colors.dark.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={iconSize.md} color={colors.dark.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  listFlex: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm + spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  headerHit: {
    width: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  headerName: { ...typography.navTitle, color: colors.dark.text },
  typingLabel: { ...typography.overlayMicro, color: colors.primary.teal, marginTop: 2 },
  loader: { flex: 1 },
  messageList: { padding: layout.screenPadding, gap: spacing.sm },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sheet / 2,
    marginBottom: spacing.xs,
  },
  bubbleMe: {
    backgroundColor: colors.primary.royal,
    alignSelf: 'flex-end',
    borderBottomRightRadius: spacing.xs,
  },
  bubbleOther: {
    backgroundColor: colors.dark.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  bubbleText: { fontSize: 15, color: colors.dark.text, lineHeight: 21 },
  bubbleTextMe: { color: colors.dark.text },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bubbleTime: { fontSize: 10, color: colors.dark.textMuted },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
  typingWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.dark.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.sheet / 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.dark.text,
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
