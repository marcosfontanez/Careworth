import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PulseStatusEditorSheet } from '@/components/mypage/PulseStatusEditorSheet';
import { relativeMyPulse } from '@/utils/format';
import type { UserProfile } from '@/types';
import { colors, spacing, typography } from '@/theme';

import { resolveMyPulseIntroLine } from '@/lib/pulseStatusDisplay';

type Props = {
  user: UserProfile;
  isOwner: boolean;
  /** When false, visitors must not see status (private/blocked). Owners always true. */
  contentVisible: boolean;
};

/**
 * Header intro under neon tags — same content as Today's Pulse (pulse_status_*),
 * tappable for owners to edit. Replaces the separate bio + Today's Pulse pill.
 */
export function MyPulseIntroLine({ user, isOwner, contentVisible }: Props) {
  const { refreshProfile } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { text: statusText, emoji: statusEmoji, updatedAt } = resolveMyPulseIntroLine(user);
  const hasLine = Boolean(statusText);
  const updatedLabel =
    updatedAt && hasLine && user.pulseStatusText?.trim()
      ? `Updated ${relativeMyPulse(updatedAt)}`
      : null;

  if (!isOwner && !contentVisible) return null;
  if (!isOwner && !hasLine) return null;

  return (
    <>
      <Pressable
        onPress={isOwner ? () => setSheetOpen(true) : undefined}
        disabled={!isOwner}
        style={({ pressed }) => [
          styles.wrap,
          isOwner && pressed ? styles.wrapPressed : null,
        ]}
        accessibilityRole={isOwner ? 'button' : 'text'}
        accessibilityLabel={
          isOwner
            ? hasLine
              ? `Today's Pulse: ${statusText}. Tap to edit.`
              : "Set today's Pulse intro"
            : statusText
        }
      >
        <Text
          style={[styles.line, !hasLine && isOwner ? styles.placeholder : null]}
          numberOfLines={2}
        >
          {hasLine ? (
            <>
              {statusEmoji ? `${statusEmoji} ` : ''}
              {statusText}
            </>
          ) : (
            "What's your Pulse today?"
          )}
        </Text>
        {updatedLabel ? <Text style={styles.meta}>{updatedLabel}</Text> : null}
      </Pressable>

      {isOwner ? (
        <PulseStatusEditorSheet
          visible={sheetOpen}
          userId={user.id}
          initialText={user.pulseStatusText ?? user.bio}
          initialEmoji={user.pulseStatusEmoji}
          onClose={() => setSheetOpen(false)}
          onSaved={refreshProfile}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs + 2,
    paddingVertical: 2,
  },
  wrapPressed: { opacity: 0.88 },
  line: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    lineHeight: 20,
  },
  placeholder: {
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
  meta: {
    ...typography.caption,
    color: colors.dark.textMuted,
    marginTop: 4,
  },
});
