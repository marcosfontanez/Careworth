import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  OVERLAY_COLOR_OPTIONS,
  OVERLAY_FONT_OPTIONS,
  OVERLAY_SIZE_OPTIONS,
  colorForOverlay,
  computeOverlayTopLeft,
  fontFamilyForOverlay,
  fontSizeForOverlay,
  overlayTextStyle,
  type VideoOverlayColor,
  type VideoOverlayFont,
  type VideoOverlaySize,
  type VideoOverlayStyle,
} from '@/lib/videoOverlayStyle';
import { colors, borderRadius, spacing } from '@/theme';

/**
 * Reusable overlay text editor.
 *
 * Two pieces:
 *  - `<DraggableOverlayText>` — absolutely-positioned, draggable text over the
 *    composer preview. Reports normalized x/y back via `onChangeStyle`.
 *  - `<OverlayStylePanel>` — chip rows for Font / Size / Color picking.
 *
 * Caller wires them together: the panel sits below the preview, the draggable
 * sits on top of the preview. Both consume the same `style` shared value so
 * font/size/color updates re-render the draggable instantly.
 */

interface DraggableProps {
  /** The current sticker text (or empty — nothing rendered). */
  text: string;
  style: VideoOverlayStyle;
  /** Called with the updated style on drag-end and on size/color/font change. */
  onChangeStyle: (next: VideoOverlayStyle) => void;
  /** Pixel width/height of the preview container — used to convert px ↔ norm. */
  containerWidth: number;
  containerHeight: number;
  /** When false, hides the draggable (used while keyboard is open on Android). */
  enabled?: boolean;
}

export function DraggableOverlayText({
  text,
  style,
  onChangeStyle,
  containerWidth,
  containerHeight,
  enabled = true,
}: DraggableProps) {
  /** Real rendered width/height of the text wrapper, captured via onLayout.
   *  Needed because the saved x_norm/y_norm represent the VISUAL CENTER of
   *  the text — converting to top-left for absolute positioning requires
   *  knowing the actual rendered size. */
  const [textSize, setTextSize] = useState<{ w: number; h: number } | null>(null);

  /** Compute the wrapper's top-left from the saved center anchor. Returns
   *  null until we have a measurement so we can hide the element on the
   *  first paint (avoids a 1-frame flash at the wrong position). */
  const anchor = useMemo(
    () => computeOverlayTopLeft(style, containerWidth, containerHeight, textSize),
    [style, containerWidth, containerHeight, textSize],
  );

  /** Shared values mirror the anchor for gesture-driven updates. They start
   *  at the resolved anchor and re-sync whenever the external style changes
   *  (e.g. font/size picker tap shifts the rendered text height). */
  const tx = useSharedValue(anchor?.left ?? 0);
  const ty = useSharedValue(anchor?.top ?? 0);
  // Captured at gesture start so dx/dy add to the right baseline.
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  React.useEffect(() => {
    if (anchor) {
      tx.value = anchor.left;
      ty.value = anchor.top;
    }
  }, [anchor, tx, ty]);

  const commit = useCallback(
    (xPx: number, yPx: number) => {
      if (!textSize) return;
      const safeW = Math.max(1, containerWidth);
      const safeH = Math.max(1, containerHeight);
      // top-left → visual center → norm
      const cx = xPx + textSize.w / 2;
      const cy = yPx + textSize.h / 2;
      const x_norm = Math.max(0, Math.min(1, cx / safeW));
      const y_norm = Math.max(0, Math.min(1, cy / safeH));
      onChangeStyle({ ...style, x_norm, y_norm });
    },
    [textSize, containerWidth, containerHeight, onChangeStyle, style],
  );

  const pan = Gesture.Pan()
    .enabled(enabled && !!text.trim() && !!textSize)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const maxX = Math.max(0, containerWidth - (textSize?.w ?? 0));
      const maxY = Math.max(0, containerHeight - (textSize?.h ?? 0));
      tx.value = Math.max(0, Math.min(maxX, startTx.value + e.translationX));
      ty.value = Math.max(0, Math.min(maxY, startTy.value + e.translationY));
    })
    .onEnd(() => {
      runOnJS(commit)(tx.value, ty.value);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const baseTextStyle = useMemo(() => overlayTextStyle(style), [style]);

  if (!text.trim() || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!textSize || textSize.w !== width || textSize.h !== height) {
            setTextSize({ w: width, h: height });
          }
        }}
        style={[
          styles.draggableHit,
          {
            // Hide until we have a measurement so the first paint doesn't
            // flash at (0,0). Anchor will be set on the NEXT render.
            opacity: anchor ? 1 : 0,
          },
          animStyle,
        ]}
      >
        <Text style={baseTextStyle} numberOfLines={3}>
          {text.trim()}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

interface PanelProps {
  style: VideoOverlayStyle;
  onChangeStyle: (next: VideoOverlayStyle) => void;
  /** Disable interaction while the post is uploading. */
  disabled?: boolean;
}

export function OverlayStylePanel({ style, onChangeStyle, disabled = false }: PanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelHint}>Drag the text to position. Tap a style to change look.</Text>

      <PickerRow label="Font">
        {OVERLAY_FONT_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            active={style.font === opt.id}
            disabled={disabled}
            onPress={() => onChangeStyle({ ...style, font: opt.id as VideoOverlayFont })}
            previewStyle={{
              fontFamily: fontFamilyForOverlay(opt.id as VideoOverlayFont),
              fontSize: 13,
              fontWeight: '900',
            }}
          />
        ))}
      </PickerRow>

      <PickerRow label="Size">
        {OVERLAY_SIZE_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            active={style.size === opt.id}
            disabled={disabled}
            onPress={() => onChangeStyle({ ...style, size: opt.id as VideoOverlaySize })}
            previewStyle={{
              fontSize: Math.min(20, fontSizeForOverlay(opt.id as VideoOverlaySize) * 0.55),
              fontWeight: '900',
            }}
          />
        ))}
      </PickerRow>

      <PickerRow label="Color">
        {OVERLAY_COLOR_OPTIONS.map((opt) => (
          <ColorSwatch
            key={opt.id}
            color={colorForOverlay(opt.id as VideoOverlayColor)}
            active={style.color === opt.id}
            disabled={disabled}
            onPress={() => onChangeStyle({ ...style, color: opt.id as VideoOverlayColor })}
            label={opt.label}
          />
        ))}
      </PickerRow>
    </View>
  );
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerChips}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  disabled,
  onPress,
  previewStyle,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  previewStyle?: { fontFamily?: string; fontSize?: number; fontWeight?: '900' | '700' };
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          previewStyle && (previewStyle as object),
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ColorSwatch({
  color,
  active,
  disabled,
  onPress,
  label,
}: {
  color: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.swatch,
        { backgroundColor: color, borderColor: active ? '#fff' : 'rgba(255,255,255,0.18)' },
        active && styles.swatchActive,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={`${label}${active ? ' (selected)' : ''}`}
    />
  );
}

const styles = StyleSheet.create({
  draggableHit: {
    position: 'absolute',
    left: 0,
    top: 0,
    // No alignSelf — we set the absolute position purely via transform so the
    // top-left of this view sits exactly at the resolved anchor.
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  panel: {
    marginTop: spacing.sm,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(15,28,48,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    gap: 10,
  },
  panelHint: {
    fontSize: 11,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
  pickerRow: {
    gap: 6,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(56,189,248,0.35)',
    borderColor: '#38BDF8',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: 13,
    color: colors.dark.text,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  swatchActive: {
    borderWidth: 3,
  },
});
