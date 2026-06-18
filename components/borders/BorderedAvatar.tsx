import React, { useState, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { BorderInfoSheet } from '@/components/borders/BorderInfoSheet';
import type { PulseAvatarFrame } from '@/types';
import type { BorderCategory } from '@/lib/borders/category';

export type BorderedAvatarProps = {
  size?: number;
  avatarUrl?: string | null;
  /** Equipped border (catalog frame) for the user being displayed. Drives the ring + long-press info. */
  pulseAvatarFrame?: PulseAvatarFrame | null;
  /** Owner display name surfaced inside BorderInfoSheet ("Wearing on @hannah"). */
  ownerDisplayName?: string | null;
  /** Override the default avatar ring colour when no `pulseAvatarFrame` is equipped. */
  ringColor?: string;
  /** Tap → typically open profile / route to user. */
  onPress?: () => void;
  /**
   * Disable the built-in long-press → BorderInfoSheet behaviour.
   * Used on owner avatars where long-press already routes to Customize.
   */
  disableLongPressInfo?: boolean;
  /** Pre-derived category badge to surface in the info sheet (when caller has full ShopItemRow context). */
  category?: BorderCategory | null;
  /** When true, prefers `avatarUrl` over local DiceBear (canonical profile photo). */
  prioritizeRemoteAvatar?: boolean;
  /** Small green presence dot. */
  showOnlineDot?: boolean;
  /** Reserved for border-governor builds — ignored in RC (optional props keep Circles compile-clean). */
  userId?: string | null;
  priority?: string;
  mode?: string;
  isVisible?: boolean;
  isFocused?: boolean;
};

/**
 * Drop-in replacement for `<AvatarDisplay/>` on social surfaces.
 *
 * - Renders the equipped border ring around the user's avatar.
 * - Long-press → opens {@link BorderInfoSheet} with category + acquisition path
 *   + a single CTA to open Pulse Shop (turns curiosity into commerce).
 * - Tap → caller's `onPress` (usually open profile).
 *
 * Owners' own avatars on My Pulse should pass `disableLongPressInfo` so the
 * existing long-press → Customize My Pulse routing keeps working.
 */
export function BorderedAvatar({
  size = 36,
  avatarUrl,
  pulseAvatarFrame,
  ownerDisplayName,
  ringColor,
  onPress,
  disableLongPressInfo,
  category,
  prioritizeRemoteAvatar = true,
  showOnlineDot,
}: BorderedAvatarProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const hasFrame = !!pulseAvatarFrame;
  const longPressEnabled = !disableLongPressInfo && hasFrame;

  const handleLongPress = useCallback(() => {
    if (!longPressEnabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoOpen(true);
  }, [longPressEnabled]);

  const inner = (
    <AvatarDisplay
      size={size}
      avatarUrl={avatarUrl ?? undefined}
      prioritizeRemoteAvatar={prioritizeRemoteAvatar}
      ringColor={ringColor}
      pulseFrame={pulseFrameFromUser(pulseAvatarFrame)}
      showOnlineDot={showOnlineDot}
    />
  );

  if (!onPress && !longPressEnabled) {
    return (
      <>
        <View>{inner}</View>
        {longPressEnabled ? (
          <BorderInfoSheet
            visible={infoOpen}
            onClose={() => setInfoOpen(false)}
            frame={pulseAvatarFrame ?? null}
            ownerDisplayName={ownerDisplayName}
            ownerAvatarUrl={avatarUrl ?? null}
            category={category ?? null}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={longPressEnabled ? handleLongPress : undefined}
        delayLongPress={420}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityHint={
          longPressEnabled ? 'Long-press to see border details' : undefined
        }
      >
        {inner}
      </Pressable>
      {longPressEnabled ? (
        <BorderInfoSheet
          visible={infoOpen}
          onClose={() => setInfoOpen(false)}
          frame={pulseAvatarFrame ?? null}
          ownerDisplayName={ownerDisplayName}
          ownerAvatarUrl={avatarUrl ?? null}
          category={category ?? null}
        />
      ) : null}
    </>
  );
}
