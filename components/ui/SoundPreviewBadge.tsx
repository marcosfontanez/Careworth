import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { colors } from '@/theme';

interface Props {
  id: string;
  url: string | null | undefined;
  /** Visual size of the round badge. Defaults to 28 -- fits the search row thumbs. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small overlayable play / pause button used on Sounds & Viral Songs rows.
 * Owns nothing -- delegates to the singleton audio previewer in
 * lib/audioPreview.ts so tapping a different row stops the previous one.
 *
 * If `url` is empty (sound has no playable media yet) the button renders
 * disabled so the user gets visual confirmation without a confusing no-op.
 */
export function SoundPreviewBadge({ id, url, size = 28, style }: Props) {
  const { isPreviewPlaying, isPreviewLoading, toggle } = useAudioPreview(id);

  const onPress = useCallback(
    (e: { stopPropagation?: () => void }) => {
      try { e.stopPropagation?.(); } catch {}
      if (!url) return;
      void toggle(id, url);
    },
    [id, url, toggle],
  );

  const disabled = !url;
  const iconName = isPreviewPlaying ? 'pause' : 'play';
  const iconSizePx = Math.round(size * 0.55);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
      accessibilityState={{ disabled, selected: isPreviewPlaying }}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {isPreviewLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <View style={isPreviewPlaying ? null : styles.iconNudge}>
          <Ionicons name={iconName} size={iconSizePx} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  /** Optical centring: the play glyph has a left bias because of its triangle shape. */
  iconNudge: { marginLeft: 1 },
});
