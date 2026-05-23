import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatList } from '@/components/live/LiveChat';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';
import { colors, borderRadius, typography } from '@/theme';
import type { StreamMessage, StreamPinnedMessage } from '@/types';

type Props = {
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  currentUserId?: string;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSend: () => void;
  onMessageLongPress: (msg: StreamMessage) => void;
  chatBlocked?: boolean;
  chatUnavailable?: boolean;
  chatSending?: boolean;
  placeholder?: string;
};

/** Compact chat rail + docked input for immersive viewer player. */
export function ViewerChatRail({
  messages,
  pinned,
  currentUserId,
  inputText,
  onChangeInput,
  onSend,
  onMessageLongPress,
  chatBlocked,
  chatUnavailable,
  chatSending = false,
  placeholder = 'Say something…',
}: Props) {
  const disabled = chatBlocked || chatUnavailable || chatSending;
  const hint = chatUnavailable
    ? 'Chat unavailable'
    : chatBlocked
      ? 'Chat blocked'
      : placeholder;

  return (
    <View style={styles.wrap}>
      <LiveChatList
        messages={messages}
        pinned={pinned}
        isHost={false}
        currentUserId={currentUserId}
        onMessageLongPress={onMessageLongPress}
        variant="overlay"
        maxOverlayMessages={5}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={hint}
          placeholderTextColor="rgba(248,250,252,0.45)"
          value={inputText}
          onChangeText={onChangeInput}
          onSubmitEditing={onSend}
          returnKeyType="send"
          maxLength={STREAM_CHAT_MAX_LENGTH}
          editable={!disabled}
        />
        <Pressable
          onPress={onSend}
          disabled={disabled}
          style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
          accessibilityLabel="Send message"
        >
          <Ionicons name="arrow-up" size={18} color={colors.dark.bg} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    maxWidth: '88%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }
      : { elevation: 4 }),
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.neutral.white,
    paddingVertical: 4,
    minHeight: 32,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
