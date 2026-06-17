import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ResilientFullImage } from '@/components/ui/ResilientFullImage';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Props = {
  uri: string;
  style?: ViewStyle;
  onZoomActiveChange?: (active: boolean) => void;
  loadingIndicator?: React.ReactNode;
};

/**
 * Pinch + pan zoom for a single photo slide. Resets when the URI changes.
 * Reports zoom state so the parent carousel can disable horizontal paging.
 */
export function PulsePhotoZoomSlide({
  uri,
  style,
  onZoomActiveChange,
  loadingIndicator,
}: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    setImageLoading(true);
  }, [uri]);

  const notifyZoom = useCallback(
    (active: boolean) => {
      onZoomActiveChange?.(active);
    },
    [onZoomActiveChange],
  );

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1, { duration: 180 });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
    notifyZoom(false);
  }, [notifyZoom, savedScale, scale, translateX, translateY]);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    notifyZoom(false);
  }, [uri, notifyZoom, savedScale, scale, translateX, translateY]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        runOnJS(notifyZoom)(false);
        return;
      }
      savedScale.value = scale.value;
      runOnJS(notifyZoom)(true);
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .minPointers(1)
    .maxPointers(1)
    .onTouchesMove((_e, state) => {
      'worklet';
      // At 1× zoom, fail immediately so the parent FlatList can swipe between photos.
      if (scale.value > 1.01) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onBegin(() => {
      startTx.value = translateX.value;
      startTy.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1.01) return;
      translateX.value = startTx.value + e.translationX;
      translateY.value = startTy.value + e.translationY;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        runOnJS(resetZoom)();
        return;
      }
      scale.value = withTiming(2);
      savedScale.value = 2;
      runOnJS(notifyZoom)(true);
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.root, style]}>
      <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture)}>
        <Animated.View style={[styles.imageWrap, imageStyle]}>
          <ResilientFullImage
            uri={uri}
            style={styles.image}
            contentFit="contain"
            imageProps={pulseImageFeedHeroProps}
            onLoad={() => setImageLoading(false)}
          />
          {imageLoading && loadingIndicator ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              {loadingIndicator}
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
