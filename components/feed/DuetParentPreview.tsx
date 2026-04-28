import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { usePost } from '@/hooks/useQueries';
import { colors, typography } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const STRIP_W = Math.round(SCREEN_W * 0.34);

export function DuetParentPreview({ parentPostId, pageHeight }: { parentPostId: string; pageHeight: number }) {
  const { data: parent } = usePost(parentPostId, { enabled: Boolean(parentPostId) });
  const uri = parent?.thumbnailUrl?.trim() || parent?.mediaUrl?.trim();

  return (
    <View style={[styles.strip, { width: STRIP_W, height: pageHeight }]} pointerEvents="none">
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : (
        <View style={[styles.ph, { height: pageHeight }]} />
      )}
      <View style={styles.badge}>
        <Text style={[styles.badgeText, typography.overlayMicro]}>Duet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.35)',
  },
  ph: { backgroundColor: 'rgba(0,0,0,0.5)' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: { color: colors.onVideo.primary, fontWeight: '800' },
});
