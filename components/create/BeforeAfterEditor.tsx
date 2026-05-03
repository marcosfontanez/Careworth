import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { MediaAsset } from '@/lib/media';

interface Props {
  before: MediaAsset;
  after: MediaAsset;
  height?: number;
}

/**
 * Draggable Before / After divider. We render two stacked images and clip the
 * top one to a width that follows the user's finger. No image compositing
 * required; the post is sent as a 2-image carousel + caption tag, and we can
 * later render the same divider in the feed by reading the same flag.
 */
export function BeforeAfterPreview({ before, after, height = 320 }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const width = Math.min(screenWidth - 32, 480);
  const split = useRef(new Animated.Value(width / 2)).current;
  const [splitVal, setSplitVal] = useState(width / 2);
  const dragStart = useRef(width / 2);

  useEffect(() => {
    const id = split.addListener((v) => setSplitVal(v.value));
    return () => split.removeListener(id);
  }, [split]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = splitVal;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(20, Math.min(width - 20, dragStart.current + g.dx));
        split.setValue(next);
      },
    }),
  ).current;

  return (
    <View style={[styles.wrap, { width, height }]} {...responder.panHandlers}>
      <Image source={{ uri: after.uri }} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFillObject, { width: splitVal, overflow: 'hidden', borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }]}>
        <Image source={{ uri: before.uri }} style={[StyleSheet.absoluteFillObject]} resizeMode="cover" />
      </View>

      <View pointerEvents="none" style={[styles.divider, { left: splitVal - 1 }]} />
      <View pointerEvents="none" style={[styles.handle, { left: splitVal - 18 }]}>
        <Ionicons name="chevron-back" size={14} color="#FFF" />
        <Ionicons name="chevron-forward" size={14} color="#FFF" />
      </View>

      <View style={[styles.tag, styles.tagLeft]}>
        <Text style={styles.tagText}>BEFORE</Text>
      </View>
      <View style={[styles.tag, styles.tagRight]}>
        <Text style={styles.tagText}>AFTER</Text>
      </View>

      <View style={styles.hintRow}>
        <Ionicons name="hand-left-outline" size={12} color="#FFF" />
        <Text style={styles.hintText}>Drag to compare</Text>
      </View>
    </View>
  );
}

interface PickerProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  hasTwoImages: boolean;
}

export function BeforeAfterToggle({ enabled, onToggle, hasTwoImages }: PickerProps) {
  return (
    <TouchableOpacity
      style={[styles.toggleRow, enabled && styles.toggleRowOn, !hasTwoImages && { opacity: 0.5 }]}
      onPress={() => hasTwoImages && onToggle(!enabled)}
      disabled={!hasTwoImages}
      activeOpacity={0.85}
    >
      <Ionicons
        name="contrast"
        size={20}
        color={enabled ? '#F97316' : colors.dark.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleTitle, enabled && { color: '#F97316' }]}>Before & After</Text>
        <Text style={styles.toggleSub}>
          {hasTwoImages
            ? 'First slide = Before, second = After. Drag the divider to compare.'
            : 'Add at least 2 photos to enable.'}
        </Text>
      </View>
      <View style={[styles.switch, enabled && styles.switchOn]}>
        <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
    alignSelf: 'center',
  },
  divider: {
    position: 'absolute', top: 0, bottom: 0,
    width: 2, backgroundColor: '#FFF',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4,
  },
  handle: {
    position: 'absolute', top: '50%',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -18 }],
  },
  tag: {
    position: 'absolute', top: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tagLeft: { left: 12 },
  tagRight: { right: 12 },
  tagText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  hintRow: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hintText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  toggleRowOn: { borderColor: '#F97316' + '88', backgroundColor: '#F9731614' },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  toggleSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  switch: {
    width: 38, height: 22, borderRadius: 12,
    backgroundColor: colors.dark.cardAlt, padding: 2, justifyContent: 'center',
  },
  switchOn: { backgroundColor: '#F97316' },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  switchKnobOn: { transform: [{ translateX: 16 }] },
});
