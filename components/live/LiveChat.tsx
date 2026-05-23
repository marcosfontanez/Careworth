import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, roleColor } from '@/theme';
import { FALLBACK_GIFT_EMOJI } from '@/lib/live/liveInteractionDebug';
import type { StreamMessage, StreamPinnedMessage, Role } from '@/types';
import { getThreadListWindow } from '@/lib/feedVideoListWindow';

const LIVE_CHAT_LIST_WINDOW = getThreadListWindow('liveChatBottom');

/**
 * Live chat role chips previously shipped a parallel color map that
 * disagreed with `RoleBadge` (RN = teal here vs royal in cards, CNA =
 * amber vs teal). Both now read from `theme/roleColors` so Live feels
 * like the same product as Feed / Circles.
 */
function RoleBadgeInline({ role }: { role?: Role }) {
  if (!role) return null;
  const abbreviation = role.length <= 3 ? role : role.split(' ').map(w => w[0]).join('');
  const accent = roleColor(role);
  return (
    <View style={[styles.roleBadge, { backgroundColor: accent + '25' }]}>
      <Text style={[styles.roleBadgeText, { color: accent }]}>{abbreviation}</Text>
    </View>
  );
}

interface ChatMessageProps {
  message: StreamMessage;
  onLongPress?: (message: StreamMessage) => void;
  variant?: 'default' | 'overlay';
}

function ChatMessage({ message, onLongPress, variant = 'default' }: ChatMessageProps) {
  const overlay = variant === 'overlay';
  const isGift = message.messageType === 'gift';
  const isSystem = message.messageType === 'system';
  const isRaid = message.messageType === 'raid';

  if (isSystem || isRaid) {
    return (
      <View style={[styles.msgRow, overlay ? styles.msgRowOverlay : styles.systemMsg, overlay && styles.systemOverlay]}>
        {!overlay ? (
          <Ionicons
            name={isRaid ? 'flash' : 'information-circle'}
            size={14}
            color={isRaid ? colors.status.premium : colors.primary.teal}
          />
        ) : null}
        <Text style={[styles.msgContent, overlay ? styles.msgContentOverlay : styles.systemText]} numberOfLines={2}>
          {message.content}
        </Text>
      </View>
    );
  }

  if (isGift && message.giftData) {
    const gift = message.giftData.gift;
    const emoji = gift?.emoji?.trim() || FALLBACK_GIFT_EMOJI;
    const giftName = gift?.name?.trim() || 'Gift';
    const giftColor = gift?.color ?? colors.status.premium;
    return (
      <View style={[styles.msgRow, overlay ? styles.msgRowOverlay : styles.giftMsg]}>
        <Text style={styles.giftEmoji}>{emoji}</Text>
        <Text style={[styles.msgContent, overlay && styles.msgContentOverlay]} numberOfLines={2}>
          <Text style={[styles.msgName, overlay && styles.msgNameOverlay, { color: colors.status.premium }]}>
            {message.displayName}
          </Text>
          {' '}
          <Text style={{ fontWeight: '700', color: giftColor }}>
            {giftName}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={onLongPress ? 0.8 : 1}
      onLongPress={onLongPress ? () => onLongPress(message) : undefined}
      delayLongPress={350}
      style={[styles.msgRow, overlay && styles.msgRowOverlay]}
    >
      {!overlay && message.isHost && (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>HOST</Text>
        </View>
      )}
      {!overlay && message.isModerator && !message.isHost && (
        <View style={styles.modBadge}>
          <Ionicons name="shield-checkmark" size={10} color="#FFF" />
        </View>
      )}
      {!overlay && message.isSubscriber && (
        <View style={styles.subBadge}>
          <Ionicons name="diamond" size={9} color={colors.status.premium} />
        </View>
      )}
      {!overlay ? <RoleBadgeInline role={message.role} /> : null}
      <Text style={[styles.msgContent, overlay && styles.msgContentOverlay]} numberOfLines={overlay ? 2 : undefined}>
        <Text style={[styles.msgName, overlay && styles.msgNameOverlay, { color: roleColor(message.role) }]}>
          {message.displayName}
          {message.isHost && overlay ? ' ·' : ''}
        </Text>
        {overlay ? ' ' : '  '}
        {message.content}
      </Text>
    </TouchableOpacity>
  );
}

interface PinnedBarProps {
  pinned: StreamPinnedMessage | null;
  onUnpin?: () => void;
  isHost: boolean;
}

export function PinnedMessageBar({ pinned, onUnpin, isHost }: PinnedBarProps) {
  if (!pinned) return null;

  return (
    <View style={styles.pinnedBar}>
      <Ionicons name="pin" size={14} color={colors.primary.teal} />
      <Text style={styles.pinnedText} numberOfLines={2}>{pinned.content}</Text>
      {isHost && onUnpin && (
        <TouchableOpacity onPress={onUnpin} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.dark.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

type LiveChatProps = {
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  isHost: boolean;
  /** Signed-in viewer/host — used to hide report on own messages. */
  currentUserId?: string;
  onUnpin?: () => void;
  /** Long-press on a chat row — host gets pin/report; viewers get report. */
  onMessageLongPress?: (message: StreamMessage) => void;
  /** Compact translucent overlay styling for immersive viewer player. */
  variant?: 'default' | 'overlay';
  maxOverlayMessages?: number;
  /**
   * Render inside a fixed-height host (Stream Manager, bottom sheets) using
   * ScrollView instead of FlatList — avoids VirtualizedList-in-ScrollView warnings.
   */
  embedded?: boolean;
};

function canLongPressChatMessage(
  message: StreamMessage,
  isHost: boolean,
  currentUserId?: string,
): boolean {
  if (message.messageType !== 'chat' || !message.content.trim()) return false;
  if (isHost) return true;
  return !!currentUserId && message.userId !== currentUserId;
}

export function LiveChatList({
  messages,
  pinned,
  isHost,
  currentUserId,
  onUnpin,
  onMessageLongPress,
  variant = 'default',
  maxOverlayMessages = 6,
  embedded = false,
}: LiveChatProps) {
  const listRef = useRef<FlatList>(null);
  const scrollRef = useRef<ScrollView>(null);
  const overlay = variant === 'overlay';
  const visibleMessages = overlay ? messages.slice(-maxOverlayMessages) : messages;

  useEffect(() => {
    if (embedded && visibleMessages.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [embedded, visibleMessages.length, visibleMessages[visibleMessages.length - 1]?.id]);

  const renderMessage = (item: StreamMessage) => (
    <ChatMessage
      key={item.id}
      message={item}
      variant={variant}
      onLongPress={
        onMessageLongPress && canLongPressChatMessage(item, isHost, currentUserId)
          ? () => onMessageLongPress(item)
          : undefined
      }
    />
  );

  return (
    <View style={[styles.chatContainer, overlay && styles.chatContainerOverlay]}>
      {!overlay ? <PinnedMessageBar pinned={pinned} onUnpin={onUnpin} isHost={isHost} /> : null}
      {overlay && pinned ? (
        <View style={styles.pinnedOverlay}>
          <Ionicons name="pin" size={11} color={colors.primary.teal} />
          <Text style={styles.pinnedOverlayTxt} numberOfLines={1}>
            {pinned.content}
          </Text>
        </View>
      ) : null}
      {embedded || overlay ? (
        <ScrollView
          ref={scrollRef}
          scrollEnabled={!overlay}
          showsVerticalScrollIndicator={false}
          style={[styles.chatList, overlay && styles.chatListOverlay]}
          contentContainerStyle={styles.embeddedListContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {visibleMessages.map(renderMessage)}
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          initialNumToRender={LIVE_CHAT_LIST_WINDOW.initialNumToRender}
          maxToRenderPerBatch={LIVE_CHAT_LIST_WINDOW.maxToRenderPerBatch}
          windowSize={LIVE_CHAT_LIST_WINDOW.windowSize}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={false}
          scrollEnabled={!overlay}
          renderItem={({ item }) => renderMessage(item)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          style={[styles.chatList, overlay && styles.chatListOverlay]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chatContainer: { flex: 1 },
  chatList: { flex: 1 },
  embeddedListContent: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 2 },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  msgName: { fontSize: 13, fontWeight: '800' },
  msgContent: { fontSize: 13, color: '#F4F7FB', flexShrink: 1, lineHeight: 19 },

  hostBadge: {
    backgroundColor: colors.status.error,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    alignSelf: 'center',
  },
  hostBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  modBadge: {
    backgroundColor: colors.primary.royal,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  subBadge: {
    backgroundColor: colors.status.premium + '20',
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },

  roleBadge: {
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'center',
  },
  roleBadgeText: { fontSize: 8, fontWeight: '900' },

  systemMsg: { backgroundColor: 'rgba(20,184,166,0.15)' },
  systemText: { color: colors.primary.teal, fontWeight: '600', fontStyle: 'italic' },

  giftMsg: {
    backgroundColor: 'rgba(212,166,58,0.15)',
    borderWidth: 1,
    borderColor: colors.status.premium + '30',
  },
  giftEmoji: { fontSize: 18, alignSelf: 'center' },

  pinnedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(20,184,166,0.12)',
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 10, marginBottom: 8, marginHorizontal: 2,
    borderWidth: 1, borderColor: colors.primary.teal + '22',
  },
  pinnedText: { flex: 1, fontSize: 12, color: '#E8EEF8', fontWeight: '600', lineHeight: 17 },

  chatContainerOverlay: { flexGrow: 0 },
  chatListOverlay: { flexGrow: 0, maxHeight: 132 },
  msgRowOverlay: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(12,18,32,0.45)',
    borderRadius: 8,
    borderWidth: 0,
    flexWrap: 'nowrap',
  },
  msgContentOverlay: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(248,250,252,0.92)',
  },
  msgNameOverlay: { fontSize: 12, fontWeight: '800' },
  systemOverlay: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 0,
  },
  pinnedOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: '92%',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(20,184,166,0.14)',
  },
  pinnedOverlayTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.88)',
  },
});
