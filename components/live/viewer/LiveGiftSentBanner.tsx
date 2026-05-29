import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  message: string;
  onDone: () => void;
};

/** Brief confirmation after a gift send succeeds. */
export function LiveGiftSentBanner({ message, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [message, onDone, opacity]);

  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <Text style={styles.txt}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(69,26,3,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    zIndex: 30,
  },
  txt: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary.gold,
  },
});
