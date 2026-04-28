import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

type Props = {
  /** Where to anchor the mark. Default `bottom-center` (most inconspicuous). */
  position?: 'bottom-center' | 'top-left';
  /** Distance from the chosen edge in px. For `bottom-center`, lift it above progress bar / chrome. */
  edgeOffset?: number;
  /** Extra horizontal inset (e.g. safe area) for `top-left`. */
  edgeInsetLeft?: number;
  /** Smaller mark for thumbnails / composer preview. */
  compact?: boolean;
  /** `subtle` lowers opacity slightly on busy / light footage. */
  variant?: 'default' | 'subtle';
};

/**
 * Persistent brand mark on in-app video playback.
 *
 * Matches the burned-in FFmpeg export wordmark: all-caps PULSEVERSE in transparent white
 * with a soft dark shadow for legibility. No pill, no logo glyph — vector-clean.
 * Defaults to bottom-center, lifted above the progress bar.
 */
export function VideoBrandWatermark({
  position = 'bottom-center',
  edgeOffset,
  edgeInsetLeft = 0,
  compact = false,
  variant = 'subtle',
}: Props) {
  const opacity = useMemo(() => {
    if (variant === 'subtle') return Platform.OS === 'web' ? 0.5 : 0.55;
    return Platform.OS === 'web' ? 0.7 : 0.78;
  }, [variant]);

  const fontSize = compact ? 11 : 22;
  const letterSpacing = compact ? 0.6 : 1.4;

  const positional =
    position === 'top-left'
      ? {
          top: '6%' as const,
          left: 10 + edgeInsetLeft,
          alignSelf: 'flex-start' as const,
        }
      : {
          bottom: edgeOffset ?? 100,
          left: 0,
          right: 0,
          alignItems: 'center' as const,
        };

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, positional, { opacity }]}
      pointerEvents="none"
    >
      <Text style={[styles.wordmark, { fontSize, letterSpacing }]} allowFontScaling={false}>
        PULSEVERSE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 7,
    flexDirection: 'row',
  },
  wordmark: {
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
