import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { exportEndCardTokens } from '@/theme/exportEndCard';
import type { EndCardTheme, ExportEndCardData } from '@/types/exportEndCard';
import { getEndCardCreatorLines } from './attribution';

type Props = {
  data: ExportEndCardData;
  theme: EndCardTheme;
  animationEnabled: boolean;
  align: 'center' | 'left' | 'right';
  /** Larger primary line (minimal layout) */
  emphasizePrimary?: boolean;
  showAvatar?: boolean;
};

export function EndCardCreatorAttribution({
  data,
  theme,
  animationEnabled,
  align,
  emphasizePrimary = false,
  showAvatar = true,
}: Props) {
  const { primary, secondary } = getEndCardCreatorLines(data);
  const opacity = useSharedValue(animationEnabled ? 0 : 1);
  const translate = useSharedValue(animationEnabled ? 8 : 0);

  useEffect(() => {
    if (!animationEnabled) {
      opacity.value = 1;
      translate.value = 0;
      return;
    }
    const delay = exportEndCardTokens.timing.creatorDelayMs;
    const t = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: exportEndCardTokens.timing.creatorFadeMs,
        easing: Easing.out(Easing.cubic),
      });
      translate.value = withTiming(0, {
        duration: exportEndCardTokens.timing.creatorFadeMs,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(t);
  }, [animationEnabled, opacity, translate]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  const alignStyle =
    align === 'center' ? styles.wrapCenter : align === 'right' ? styles.wrapRight : styles.wrapLeft;

  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

  const avatarUri = showAvatar && data.avatarUrl ? data.avatarUrl : null;

  return (
    <Animated.View style={[styles.wrap, alignStyle, anim]}>
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          contentFit="cover"
          transition={120}
        />
      ) : null}
      <View style={[styles.textCol, align === 'right' && styles.textColRight]}>
        <Text
          style={[
            emphasizePrimary ? styles.primaryLarge : styles.primary,
            { color: theme.textSecondary, textAlign },
          ]}
          numberOfLines={2}
        >
          {primary}
        </Text>
        {secondary ? (
          <Text style={[styles.secondary, { color: theme.textTertiary, textAlign }]} numberOfLines={2}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: '92%',
  },
  wrapCenter: {
    justifyContent: 'center',
  },
  wrapLeft: {
    justifyContent: 'flex-start',
  },
  wrapRight: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  textCol: {
    flexShrink: 1,
    gap: 4,
  },
  textColRight: {
    alignItems: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primary: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  primaryLarge: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  secondary: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
