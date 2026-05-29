import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  type KeyboardEvent,
  type LayoutChangeEvent,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  computeOverlayTopLeft,
  overlayTextStyle,
  type VideoOverlayStyle,
} from '@/lib/videoOverlayStyle';
import { colors, borderRadius } from '@/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Floating mini-preview that pins above the keyboard when the user is editing
 * the on-video overlay text (font / size / color / position).
 *
 * Purpose: the user previously had to scroll up to the main preview every time
 * they tweaked the text or a style chip. The PIP keeps a live preview of the
 * styled overlay over the video poster frame visible while they type.
 *
 * Why poster instead of a second video player:
 *  - expo-video doesn't handle two players for the same URI gracefully
 *    (resource contention, audio routing fights).
 *  - The poster + overlay is what feed render uses anyway when paused.
 *  - We do not preview animated content here — the user is editing TEXT.
 *
 * Activation rules:
 *  - `visible` is owned by the parent (composer sets it when the overlay
 *    TextInput gains focus and the keyboard is up).
 *  - PIP auto-hides when the keyboard collapses or `visible` flips false.
 */

interface Props {
  visible: boolean;
  posterUri: string | null;
  text: string;
  style: VideoOverlayStyle;
  onDismiss: () => void;
  /** Optional: scrolls the composer back to the main preview on tap. */
  onTapExpand?: () => void;
}

const PIP_WIDTH = 152;
/** 9:16 vertical-video aspect — matches the feed page render. */
const PIP_HEIGHT = Math.round((PIP_WIDTH * 16) / 9);
const PIP_RIGHT_MARGIN = 16;

export function OverlayEditFloatingPreview({
  visible,
  posterUri,
  text,
  style,
  onDismiss,
  onTapExpand,
}: Props) {
  /** Live keyboard top — pip sits 8pt above it. Falls back to ~screen-bottom
   *  when the keyboard is dismissed (animates off via `opacity`). */
  const [kbTop, setKbTop] = useState<number>(SCREEN_H);
  const [pipSize, setPipSize] = useState<{ w: number; h: number }>({
    w: PIP_WIDTH,
    h: PIP_HEIGHT,
  });

  // Keyboard tracking — needed for the bottom anchor. iOS uses Will* for
  // smoother sync with the typing experience; Android only fires Did*.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      const top = (e.endCoordinates?.screenY ?? SCREEN_H);
      setKbTop(top);
    };
    const onHide = () => setKbTop(SCREEN_H);
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 180 });
    translateY.value = withTiming(visible ? 0 : 20, { duration: 200 });
  }, [visible, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Position: anchored to top of the keyboard (or above the home indicator if
  // no keyboard), right-aligned with a small inset.
  const top = Math.max(80, kbTop - PIP_HEIGHT - 12);

  // Scaled font: the main preview is full-screen; PIP is ~152pt wide. Scale
  // the text down proportionally so what they see in the PIP matches the feed
  // visual hierarchy. Use SCREEN_W as the reference.
  const scale = pipSize.w / SCREEN_W;
  const baseStyle = useMemo(() => overlayTextStyle(style), [style]);
  const scaledFontSize = Math.max(7, (baseStyle.fontSize ?? 16) * scale * 1.4);

  /** Rendered text size INSIDE the PIP — needed for centered positioning. */
  const [textSize, setTextSize] = useState<{ w: number; h: number } | null>(null);
  const overlayAnchor = computeOverlayTopLeft(style, pipSize.w, pipSize.h, textSize);

  const onPipLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== pipSize.w || height !== pipSize.h) {
      setPipSize({ w: width, h: height });
    }
  };

  /** Don't even mount the heavy components when fully hidden — avoids
   *  expo-image keeping resources alive once the user is done editing. */
  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.pipWrap,
        {
          top,
          right: PIP_RIGHT_MARGIN,
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
        },
        animStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onTapExpand}
        style={StyleSheet.absoluteFillObject}
        onLayout={onPipLayout}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 18 : 0} tint="dark" style={StyleSheet.absoluteFillObject} />
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={0}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: colors.dark.cardAlt },
            ]}
          />
        )}
        {/* Dim veil so any color text reads on bright posters. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
        />
        {text.trim() ? (
          <View
            pointerEvents="none"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (!textSize || textSize.w !== width || textSize.h !== height) {
                setTextSize({ w: width, h: height });
              }
            }}
            style={{
              position: 'absolute',
              left: overlayAnchor?.left ?? 0,
              top: overlayAnchor?.top ?? 0,
              maxWidth: pipSize.w * 0.9,
              opacity: overlayAnchor ? 1 : 0,
            }}
          >
            <Text
              style={[
                baseStyle,
                styles.pipText,
                { fontSize: scaledFontSize, lineHeight: scaledFontSize * 1.15 },
              ]}
              numberOfLines={3}
            >
              {text.trim()}
            </Text>
          </View>
        ) : (
          <View pointerEvents="none" style={styles.pipPlaceholderWrap}>
            <Text style={styles.pipPlaceholderText}>Live preview</Text>
          </View>
        )}
        <View style={styles.pipBorder} pointerEvents="none" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        hitSlop={10}
        accessibilityLabel="Hide live preview"
      >
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pipWrap: {
    position: 'absolute',
    borderRadius: borderRadius.lg,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    zIndex: 1000,
  },
  pipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.55)',
  },
  pipText: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  pipPlaceholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipPlaceholderText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    opacity: 0.7,
  },
  closeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(7,17,31,0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
