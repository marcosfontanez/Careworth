import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCommentThread } from '@/components/comments/PostCommentThread';
import { usePost } from '@/hooks/useQueries';
import {
  feedCommentsSheetHeight,
  formatCommentsSheetTitle,
  shouldDismissFeedCommentsSheet,
} from '@/lib/feedCommentsSheetUi';
import {
  pulseColors,
  pulseRadius,
  pulseSpacing,
  pulseTypography,
} from '@/lib/theme/pulseTheme';
import type { Post } from '@/types';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  circleSlug?: string | null;
  onCommentAdded?: () => void;
};

export function FeedCommentsSheet({
  visible,
  post,
  onClose,
  circleSlug = null,
  onCommentAdded,
}: Props) {
  const insets = useSafeAreaInsets();
  const sheetHeight = useMemo(() => feedCommentsSheetHeight(SCREEN_H), []);
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const isDismissingRef = useRef(false);

  /**
   * Sheet height + lift composition for keyboard awareness:
   *
   *   keyboard CLOSED → sheet at rest, height = sheetHeight, no lift
   *   keyboard OPEN   → sheet lifts up by kbHeight so the docked composer sits
   *                     just above the keyboard, AND sheet height shrinks to
   *                     fit between safe-area-top and keyboard-top so the
   *                     header never disappears off the screen.
   *
   * `useAnimatedKeyboard()` reports the keyboard height on the UI thread,
   * perfectly synced with the OS keyboard curve — no JS-thread lag.
   *
   * Android already resizes the host window via `softwareKeyboardLayoutMode:
   * "resize"` in app.json, so the OS pushes the sheet up automatically. Adding
   * a manual lift on top of that would double-shift; use 0 on Android.
   */
  const keyboard = useAnimatedKeyboard();
  /** Reserve safe area top + 16px breathing room above the sheet header. */
  const safeTopBuffer = (insets.top || 0) + 16;
  /** Don't let the sheet collapse to nothing on tiny screens. */
  const MIN_SHEET_HEIGHT = 280;

  const finishDismiss = useCallback(() => {
    isDismissingRef.current = false;
    onClose();
  }, [onClose]);

  const dismissSheet = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
      if (finished) runOnJS(finishDismiss)();
    });
    backdropOpacity.value = withTiming(0, { duration: 180 });
  }, [finishDismiss, sheetHeight, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      isDismissingRef.current = false;
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = sheetHeight;
      backdropOpacity.value = 0;
      isDismissingRef.current = false;
    }
  }, [visible, sheetHeight, translateY, backdropOpacity]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissSheet();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismissSheet]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (shouldDismissFeedCommentsSheet(e.translationY, e.velocityY)) {
        runOnJS(dismissSheet)();
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => {
    const kbLift = Platform.OS === 'ios' ? keyboard.height.value : 0;
    /** Available vertical space between safe-area-top and the keyboard top. */
    const available = SCREEN_H - kbLift - safeTopBuffer;
    /** Compress to fit only when needed — keep the original height otherwise. */
    const compressed = Math.max(
      MIN_SHEET_HEIGHT,
      Math.min(sheetHeight, available),
    );
    return {
      height: compressed,
      transform: [{ translateY: translateY.value - kbLift }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const { data: livePost } = usePost(post?.id ?? '', { enabled: visible && !!post?.id });
  const displayPost = livePost ?? post;

  if (!visible || !post || !displayPost) return null;

  const commentCount = displayPost.commentCount ?? 0;
  const title = formatCommentsSheetTitle(commentCount);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={styles.backdropPress}
          onPress={dismissSheet}
          accessibilityRole="button"
          accessibilityLabel="Close comments"
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <LinearGradient
          colors={['rgba(15, 28, 48, 0.96)', 'rgba(12, 18, 32, 0.98)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(56, 189, 248, 0.12)', 'transparent']}
          style={styles.topHighlight}
          pointerEvents="none"
        />
        <GestureDetector gesture={panGesture}>
          <View>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                onPress={dismissSheet}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close comments"
              >
                <Ionicons name="close" size={22} color={pulseColors.text} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>

        <View style={styles.body}>
          <PostCommentThread
            postId={displayPost.id}
            post={displayPost}
            circleSlug={circleSlug}
            showMediaHeader={false}
            compact
            onCommentAdded={onCommentAdded}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: pulseColors.backdrop,
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: pulseRadius.sheet,
    borderTopRightRadius: pulseRadius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: pulseColors.borderAccent,
    overflow: 'hidden',
    backgroundColor: pulseColors.glassStrong,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: pulseSpacing.sm,
    paddingBottom: pulseSpacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: pulseSpacing.lg,
    paddingBottom: pulseSpacing.sm,
    gap: pulseSpacing.sm,
  },
  title: {
    ...pulseTypography.sectionTitle,
    flex: 1,
    fontSize: 17,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
