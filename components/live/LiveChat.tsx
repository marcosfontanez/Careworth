import React, { useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, roleColor } from '@/theme';
import type { StreamMessage, StreamPinnedMessage, Role } from '@/types';

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
}

function ChatMessage({ message, onLongPress }: ChatMessageProps) {
  const isGift = message.messageType === 'gift';
  const isSystem = message.messageType === 'system';
  const isRaid = message.messageType === 'raid';

  if (isSystem || isRaid) {
    return (
      <View style={[styles.msgRow, styles.systemMsg]}>
        <Ionicons
          name={isRaid ? 'flash' : 'information-circle'}
          size={14}
          color={isRaid ? colors.status.premium : colors.primary.teal}
        />
        <Text style={[styles.msgContent, styles.systemText]}>{message.content}</Text>
      </View>
    );
  }

  if (isGift && message.giftData) {
    return (
      <View style={[styles.msgRow, styles.giftMsg]}>
        <Text style={styles.giftEmoji}>{message.giftData.gift.emoji}</Text>
        <Text style={styles.msgContent}>
          <Text style={[styles.msgName, { color: colors.status.premium }]}>
            {message.displayName}
          </Text>
          {' sent '}
          <Text style={{ fontWeight: '800', color: message.giftData.gift.color }}>
            {message.giftData.gift.name}
          </Text>
          {message.giftData.quantity > 1 && (
            <Text style={{ fontWeight: '800', color: colors.status.premium }}>
              {' '}x{message.giftData.quantity}
            </Text>
          )}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={onLongPress ? 0.8 : 1}
      onLongPress={onLongPress ? () => onLongPress(message) : undefined}
      delayLongPress={350}
      style={styles.msgRow}
    >
      {message.isHost && (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>HOST</Text>
        </View>
      )}
      {message.isModerator && !message.isHost && (
        <View style={styles.modBadge}>
          <Ionicons name="shield-checkmark" size={10} color="#FFF" />
        </View>
      )}
      {message.isSubscriber && (
        <View style={styles.subBadge}>
          <Ionicons name="diamond" size={9} color={colors.status.premium} />
        </View>
      )}
      <RoleBadgeInline role={message.role} />
      <Text style={styles.msgContent}>
        <Text style={[styles.msgName, { color: roleColor(message.role) }]}>
          {message.displayName}
        </Text>
        {'  '}
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

interface LiveChatProps {
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  isHost: boolean;
  onUnpin?: () => void;
  /** Fired when host long-presses a chat message — used to offer Pin option. */
  onMessageLongPress?: (message: StreamMessage) => void;
}

export function LiveChatList({
  messages,
  pinned,
  isHost,
  onUnpin,
  onMessageLongPress,
}: LiveChatProps) {
  const listRef = useRef<FlatList>(null);

  return (
    <View style={styles.chatContainer}>
      <PinnedMessageBar pinned={pinned} onUnpin={onUnpin} isHost={isHost} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            onLongPress={isHost ? onMessageLongPress : undefined}
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        style={styles.chatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chatContainer: { flex: 1 },
  chatList: { flex: 1 },

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
});
