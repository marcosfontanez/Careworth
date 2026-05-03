import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type PhotoFrameId } from '@/lib/photoFrames';
import { colors } from '@/theme';

interface Props {
  frame: PhotoFrameId;
  caption?: string;
  /** Optional: title for magazine frame. */
  title?: string;
}

/**
 * Pure-View overlay frame painted on top of the photo slide. No image
 * compositing — this is preview decoration. The chosen frame id is persisted
 * so the feed can later render the same overlay.
 */
export function PhotoFrameOverlay({ frame, caption, title }: Props) {
  if (frame === 'none') return null;
  switch (frame) {
    case 'polaroid':
      return (
        <View pointerEvents="none" style={styles.polaroid}>
          <View style={styles.polaroidStrip}>
            <Text style={styles.polaroidText} numberOfLines={1}>
              {caption?.trim() || 'PulseVerse'}
            </Text>
          </View>
        </View>
      );
    case 'badge':
      return (
        <View pointerEvents="none" style={styles.badgeWrap}>
          <View style={styles.badgeClip} />
          <View style={styles.badgeBar}>
            <Text style={styles.badgeText}>RN · ID 0421</Text>
          </View>
        </View>
      );
    case 'magazine':
      return (
        <View pointerEvents="none" style={styles.magazineWrap}>
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.magazineTop}
          >
            <Text style={styles.magazineKicker}>PULSE</Text>
            <Text style={styles.magazineTitle} numberOfLines={2}>
              {(title || caption || 'Cover Story').slice(0, 40)}
            </Text>
          </LinearGradient>
        </View>
      );
    case 'sticky':
      return (
        <View pointerEvents="none" style={styles.stickyWrap}>
          <View style={styles.sticky}>
            <Text style={styles.stickyText} numberOfLines={2}>
              {(caption || 'Note to self').slice(0, 60)}
            </Text>
          </View>
        </View>
      );
    case 'lanyard':
      return (
        <View pointerEvents="none" style={styles.lanyardWrap}>
          <View style={styles.lanyardStrap} />
          <View style={styles.lanyardClip} />
        </View>
      );
    case 'chart':
      return (
        <View pointerEvents="none" style={styles.chartWrap}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>PT NOTES</Text>
            <Text style={styles.chartLabel}>· {new Date().toLocaleDateString()}</Text>
          </View>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  polaroid: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 12,
    borderColor: '#FFFFFF',
    borderBottomWidth: 56,
    backgroundColor: 'transparent',
  },
  polaroidStrip: {
    position: 'absolute',
    bottom: -48,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  polaroidText: { fontSize: 13, fontWeight: '800', color: '#0F172A', letterSpacing: 0.4 },

  badgeWrap: { ...StyleSheet.absoluteFillObject },
  badgeClip: {
    position: 'absolute',
    top: -8,
    left: '50%',
    width: 80, height: 16, borderRadius: 6,
    backgroundColor: '#94A3B8',
    transform: [{ translateX: -40 }],
  },
  badgeBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  badgeText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },

  magazineWrap: { ...StyleSheet.absoluteFillObject },
  magazineTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  magazineKicker: { fontSize: 12, fontWeight: '900', color: '#FCD34D', letterSpacing: 4 },
  magazineTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.4 },

  stickyWrap: {
    position: 'absolute', top: 14, right: 14,
    transform: [{ rotate: '-3deg' }],
  },
  sticky: {
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FEF08A',
    maxWidth: 160,
    borderTopRightRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 4 },
  },
  stickyText: { fontSize: 12, fontWeight: '800', color: '#1F2937' },

  lanyardWrap: { ...StyleSheet.absoluteFillObject },
  lanyardStrap: {
    position: 'absolute', top: 0, left: '50%', width: 28, height: 28,
    backgroundColor: colors.primary.teal,
    transform: [{ translateX: -14 }],
  },
  lanyardClip: {
    position: 'absolute', top: 28, left: '50%',
    width: 12, height: 14, borderRadius: 4,
    backgroundColor: '#9CA3AF',
    transform: [{ translateX: -6 }],
  },

  chartWrap: { ...StyleSheet.absoluteFillObject },
  chartHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  chartLabel: { fontSize: 11, fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
});
