import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';
import { PulseIconButton } from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography, pulseZIndex } from '@/lib/theme/pulseTheme';

type Props = {
  inputText: string;
  onChangeInput: (text: string) => void;
  onSend: () => void;
  onOpenChatSheet: () => void;
  onOpenGifts: () => void;
  onPollQna: () => void;
  onOpenMore: () => void;
  onOpenClipSheet: () => void;
  clipSaving?: boolean;
  giftsEnabled: boolean;
  hasActivePoll: boolean;
  chatUnavailable?: boolean;
  chatSending?: boolean;
  giftSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** When the chat sheet is open, bar is tap-to-open only (composer lives in sheet). */
  useSheetComposer?: boolean;
};

/** Video-first bottom bar — chat input + gift / poll-Q&A / more actions. */
export function ViewerLiveBottomBar({
  inputText,
  onChangeInput,
  onSend,
  onOpenChatSheet,
  onOpenGifts,
  onPollQna,
  onOpenMore,
  onOpenClipSheet,
  clipSaving = false,
  giftsEnabled,
  hasActivePoll,
  chatUnavailable = false,
  chatSending = false,
  giftSending = false,
  disabled = false,
  placeholder = 'Say something…',
  useSheetComposer = false,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const canSend = Boolean(inputText.trim()) && !chatUnavailable && !chatSending && !disabled;
  const previewText =
    inputText.trim() || (chatUnavailable ? 'Chat opens when live…' : placeholder);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(7, 17, 31, 0)', 'rgba(7, 17, 31, 0.72)']}
        style={styles.fade}
        pointerEvents="none"
      />
      <View style={styles.row}>
        {useSheetComposer ? (
          <Pressable style={styles.inputShell} onPress={onOpenChatSheet} accessibilityRole="button">
            <Text style={styles.inputPreview} numberOfLines={1}>
              {previewText}
            </Text>
            <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
              <Ionicons name="send" size={15} color={pulseColors.mutedText} />
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={styles.inputShell}
            onPress={() => {
              onOpenChatSheet();
              inputRef.current?.focus();
            }}
          >
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={onChangeInput}
              placeholder={chatUnavailable ? 'Chat opens when live…' : placeholder}
              placeholderTextColor={pulseColors.mutedText}
              style={styles.input}
              editable={!chatUnavailable && !disabled}
              maxLength={STREAM_CHAT_MAX_LENGTH}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (canSend) onSend();
              }}
              onFocus={onOpenChatSheet}
            />
            <Pressable
              onPress={() => {
                if (canSend) onSend();
              }}
              disabled={!canSend}
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              accessibilityLabel="Send message"
            >
              {chatSending ? (
                <ActivityIndicator size="small" color={pulseColors.onAccent} />
              ) : (
                <Ionicons name="send" size={15} color={canSend ? pulseColors.onAccent : pulseColors.mutedText} />
              )}
            </Pressable>
          </Pressable>
        )}

        <DockIcon
          icon="gift-outline"
          label="Gift"
          accent="gift"
          onPress={onOpenGifts}
          disabled={disabled || !giftsEnabled || giftSending}
          loading={giftSending}
        />
        <DockIcon
          icon={hasActivePoll ? 'stats-chart' : 'help-circle-outline'}
          label={hasActivePoll ? 'Poll' : 'Q&A'}
          onPress={onPollQna}
          disabled={disabled}
          badge={hasActivePoll}
        />
        <DockIcon
          icon="cut-outline"
          label="Clip"
          accent="teal"
          onPress={onOpenClipSheet}
          disabled={disabled || clipSaving}
          loading={clipSaving}
        />
        <DockIcon icon="ellipsis-horizontal" label="More" onPress={onOpenMore} disabled={disabled} />
      </View>
    </View>
  );
}

function DockIcon({
  icon,
  label,
  onPress,
  disabled,
  accent,
  badge,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: 'gift' | 'teal';
  badge?: boolean;
  loading?: boolean;
}) {
  const iconColor =
    accent === 'gift'
      ? pulseColors.gift
      : accent === 'teal'
        ? pulseColors.teal
        : pulseColors.text;

  if (!badge && !loading && !accent) {
    return (
      <PulseIconButton
        icon={icon}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
        size="md"
        tone="default"
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.iconBtn,
        accent === 'gift' && styles.iconBtnGift,
        accent === 'teal' && styles.iconBtnTeal,
        disabled && styles.iconBtnDisabled,
        pressed && !disabled && styles.iconBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons name={icon} size={20} color={disabled ? pulseColors.mutedText : iconColor} />
      )}
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: pulseSpacing.lg,
    paddingBottom: pulseSpacing.xs,
    zIndex: pulseZIndex.dock,
  },
  fade: {
    position: 'absolute',
    left: -pulseSpacing.md,
    right: -pulseSpacing.md,
    bottom: 0,
    height: 96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pulseSpacing.sm,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: pulseSpacing.lg,
    paddingRight: 6,
    minHeight: 44,
    borderRadius: pulseRadius.full,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...pulseTypography.bodySmall,
    color: pulseColors.text,
    paddingVertical: pulseSpacing.sm,
  },
  inputPreview: {
    flex: 1,
    minWidth: 0,
    ...pulseTypography.bodySmall,
    color: pulseColors.textSecondary,
    paddingVertical: pulseSpacing.sm,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.teal,
  },
  sendBtnDisabled: {
    backgroundColor: pulseColors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: pulseRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  iconBtnGift: {
    borderColor: 'rgba(246, 196, 83, 0.28)',
  },
  iconBtnTeal: {
    borderColor: pulseColors.borderAccent,
  },
  iconBtnDisabled: { opacity: 0.45 },
  iconBtnPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: pulseColors.teal,
    borderWidth: 1,
    borderColor: pulseColors.background,
  },
});
