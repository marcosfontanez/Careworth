import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius, typography } from '@/theme';
import { FALLBACK_GIFT_EMOJI } from '@/lib/live/liveInteractionDebug';
import type { LiveGift } from '@/types';

type Props = {
  gift: LiveGift | null;
  senderName?: string;
  quantity?: number;
  onDone?: () => void;
};

/** Brief gift burst over the video — does not block the whole stream. */
export function ViewerGiftBurst({ gift, senderName, quantity = 1, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!gift?.id) return;
    try {
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDone?.();
      });
    } catch (err) {
      if (__DEV__) console.warn('[ViewerGiftBurst]', err);
      onDone?.();
    }
  }, [gift?.id, opacity, translateY, onDone]);

  if (!gift?.id) return null;

  const emoji = gift.emoji?.trim() || FALLBACK_GIFT_EMOJI;
  const giftName = gift.name?.trim() || 'Gift';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {senderName ?? 'Someone'}
        </Text>
        <Text style={styles.giftName}>
          sent {giftName}
          {quantity > 1 ? ` x${quantity}` : ''}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    zIndex: 40,
    maxWidth: '80%',
  },
  emoji: { fontSize: 28 },
  meta: { flexShrink: 1 },
  name: { ...typography.caption, fontWeight: '800', color: colors.neutral.white },
  giftName: { ...typography.caption, color: colors.primary.gold, fontWeight: '700' },
});
