import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatList } from '@/components/live/LiveChat';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
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
  onUnpin: () => void;
  onPinMessage?: (msg: StreamMessage) => void;
  onMessageLongPress: (msg: StreamMessage) => void;
  /** Tap a chat author name → open their Pulse Page. */
  onPressUser?: (msg: StreamMessage) => void;
  onLaunchPoll?: () => void;
  chatBlocked?: boolean;
  chatSending?: boolean;
  listHeight?: number;
  /** Fill parent flex space instead of fixed list height (Stream Manager). */
  fillAvailable?: boolean;
};

export function LiveChatPanel({
  messages,
  pinned,
  currentUserId,
  inputText,
  onChangeInput,
  onSend,
  onUnpin,
  onPinMessage,
  onMessageLongPress,
  onPressUser,
  onLaunchPoll,
  chatBlocked = false,
  chatSending = false,
  listHeight = 280,
  fillAvailable = false,
}: Props) {
  const disabled = chatBlocked || chatSending;

  return (
    <View style={[styles.wrap, fillAvailable && styles.wrapFill]}>
      <View style={fillAvailable ? styles.listFill : { height: listHeight }}>
        <LiveChatList
          messages={messages}
          pinned={pinned}
          isHost
          currentUserId={currentUserId}
          onUnpin={onUnpin}
          onPinMessage={onPinMessage}
          onMessageLongPress={onMessageLongPress}
          onPressUser={onPressUser}
          embedded={fillAvailable || listHeight < 320}
        />
      </View>
      <View style={styles.inputRow}>
        {onLaunchPoll ? (
          <TouchableOpacity style={styles.sideBtn} onPress={onLaunchPoll} accessibilityLabel="Launch poll">
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary.teal} />
          </TouchableOpacity>
        ) : null}
        <AccentComposerFrame
          accentColor={colors.primary.teal}
          compact
          noShadow
          style={{ flex: 1 }}
          footer={
            <AccentCharCount
              length={inputText.length}
              max={STREAM_CHAT_MAX_LENGTH}
              accentColor={colors.primary.teal}
              warnWithin={40}
            />
          }
        >
          <TextInput
            style={styles.input}
            placeholder={chatBlocked ? 'Chat unavailable' : 'Talk to your viewers…'}
            placeholderTextColor={colors.dark.textQuiet}
            value={inputText}
            onChangeText={onChangeInput}
            onSubmitEditing={onSend}
            returnKeyType="send"
            maxLength={STREAM_CHAT_MAX_LENGTH}
            editable={!disabled}
          />
        </AccentComposerFrame>
        <TouchableOpacity
          onPress={onSend}
          style={[styles.sendBtn, disabled && { opacity: 0.45 }]}
          disabled={disabled}
        >
          <Ionicons name="arrow-up" size={20} color={colors.dark.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  wrapFill: { flex: 1 },
  listFill: { flex: 1, minHeight: 160 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 4 },
  sideBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    ...typography.body,
    fontSize: 15,
    color: colors.neutral.white,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
