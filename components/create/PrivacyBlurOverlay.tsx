import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

type Props = {
  active: boolean;
  children: React.ReactNode;
  /** Outer container style when active (e.g. match preview border radius). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Strong preview-only blur for anonymous drafts — does not change the uploaded asset.
 * Overlay uses pointerEvents="none" so controls (remove, reorder) stay usable on top layers below in z-order;
 * when wrapped as the outermost layer, pass through still reaches siblings behind in RN hit testing.
 */
export function PrivacyBlurOverlay({ active, children, style }: Props) {
  if (!active) return <>{children}</>;

  return (
    <View style={[styles.wrap, style]}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.webFallback]} />
        ) : (
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  webFallback: { backgroundColor: 'rgba(0,0,0,0.72)' },
});
