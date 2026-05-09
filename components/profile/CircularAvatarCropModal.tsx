import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image as RNImage,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { captureRef as captureViewSnapshot } from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '@/theme';
import type { MediaAsset } from '@/lib/media';

const VIEWPORT_DP = 300;
const CAPTURE_PX = 800;

function clampTranslation(tx: number, ty: number, imgW: number, imgH: number, scale: number, vp: number) {
  'worklet';
  const sw = imgW * scale;
  const sh = imgH * scale;
  const maxX = Math.max(0, (sw - vp) / 2);
  const maxY = Math.max(0, (sh - vp) / 2);
  return {
    tx: Math.min(maxX, Math.max(-maxX, tx)),
    ty: Math.min(maxY, Math.max(-maxY, ty)),
  };
}

type Props = {
  visible: boolean;
  asset: MediaAsset | null;
  onDismiss: () => void;
  /** JPEG-ready asset (re-encoded + sized); caller uploads to Storage. */
  onComplete: (asset: MediaAsset) => void;
};

export function CircularAvatarCropModal({ visible, asset, onDismiss, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const vp = Math.min(VIEWPORT_DP, winW - spacing.xl * 2);

  const [dims, setDims] = useState<{ iw: number; ih: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const snapshotTargetRef = useRef<View>(null);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  useEffect(() => {
    if (!visible || !asset) return;
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;

    const w = asset.width;
    const h = asset.height;
    if (w && h && w > 0 && h > 0) {
      setDims({ iw: w, ih: h });
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      asset.uri,
      (iw, ih) => {
        if (!cancelled) setDims({ iw, ih });
      },
      () => {
        if (!cancelled) setDims({ iw: 1024, ih: 1024 });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [visible, asset, scale, translateX, translateY]);

  const layout = useMemo(() => {
    if (!dims) return null;
    const base = Math.max(vp / dims.iw, vp / dims.ih);
    return {
      imgW: dims.iw * base,
      imgH: dims.ih * base,
    };
  }, [dims, vp]);

  const pinchGesture = useMemo(() => {
    if (!layout) return Gesture.Pinch();
    return Gesture.Pinch()
      .onBegin(() => {
        startScale.value = scale.value;
      })
      .onUpdate((e) => {
        const next = Math.min(4, Math.max(1, startScale.value * e.scale));
        scale.value = next;
        const c = clampTranslation(
          translateX.value,
          translateY.value,
          layout.imgW,
          layout.imgH,
          next,
          vp,
        );
        translateX.value = c.tx;
        translateY.value = c.ty;
      });
  }, [layout, scale, translateX, translateY, startScale, vp]);

  const panGesture = useMemo(() => {
    if (!layout) return Gesture.Pan();
    return Gesture.Pan()
      .onBegin(() => {
        startTx.value = translateX.value;
        startTy.value = translateY.value;
      })
      .onUpdate((e) => {
        const nx = startTx.value + e.translationX;
        const ny = startTy.value + e.translationY;
        const c = clampTranslation(nx, ny, layout.imgW, layout.imgH, scale.value, vp);
        translateX.value = c.tx;
        translateY.value = c.ty;
      });
  }, [layout, translateX, translateY, startTx, startTy, scale, vp]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const onUsePhoto = useCallback(async () => {
    if (!asset || !snapshotTargetRef.current || !layout) return;
    setBusy(true);
    try {
      const tmpUri = await captureViewSnapshot(snapshotTargetRef.current, {
        format: 'jpg',
        quality: 0.95,
        width: CAPTURE_PX,
        height: CAPTURE_PX,
        result: 'tmpfile',
      });
      const normalized = await ImageManipulator.manipulateAsync(
        tmpUri,
        [{ resize: { width: 1536 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      onComplete({
        uri: normalized.uri,
        type: 'image',
        mimeType: 'image/jpeg',
        fileName: `avatar-${Date.now()}.jpg`,
        width: normalized.width,
        height: normalized.height,
      });
      onDismiss();
    } catch (e) {
      console.warn('[CircularAvatarCropModal]', e);
      Alert.alert(
        'Could not prepare photo',
        e instanceof Error ? e.message : 'Try another image or take a new photo.',
      );
    } finally {
      setBusy(false);
    }
  }, [asset, layout, onComplete, onDismiss]);

  if (!asset) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onDismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onDismiss} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Adjust photo</Text>
          <View style={styles.headerBtn} />
        </View>

        <Text style={styles.subtitle}>
          Pinch and drag. The circle matches how your avatar appears across the app.
        </Text>

        {!layout ? (
          <ActivityIndicator color={colors.primary.teal} style={{ marginTop: 48 }} />
        ) : (
          <>
            <View style={styles.previewShell}>
              <View
                ref={snapshotTargetRef}
                collapsable={false}
                style={[
                  styles.circleClip,
                  {
                    width: vp,
                    height: vp,
                    borderRadius: vp / 2,
                  },
                ]}
              >
                <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        width: layout.imgW,
                        height: layout.imgH,
                        left: (vp - layout.imgW) / 2,
                        top: (vp - layout.imgH) / 2,
                      },
                      imageAnimatedStyle,
                    ]}
                  >
                    <Image
                      source={{ uri: asset.uri }}
                      style={{ width: layout.imgW, height: layout.imgH }}
                      contentFit="cover"
                    />
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
              onPress={() => void onUsePhoto()}
              disabled={busy}
              activeOpacity={0.9}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Use this photo</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerBtn: { minWidth: 72 },
  headerBtnText: { ...typography.bodySmall, color: colors.primary.teal, fontWeight: '700' },
  title: { ...typography.title, color: colors.dark.text },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  previewShell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  circleClip: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    marginTop: 'auto',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
