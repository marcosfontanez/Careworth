import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pulseGradients, pulseColors } from '@/lib/theme/pulseTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Apply safe-area padding on top/bottom. Default true. */
  safe?: boolean;
  /** Show subtle top accent veil. Default true. */
  accentVeil?: boolean;
};

/** Full-screen PulseVerse canvas — navy gradient base with optional accent veil. */
export function PulseScreen({ children, style, safe = true, accentVeil = true }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...pulseGradients.screen]} style={StyleSheet.absoluteFill} />
      {accentVeil ? (
        <LinearGradient
          colors={[...pulseGradients.screenVeil]}
          style={styles.veil}
          pointerEvents="none"
        />
      ) : null}
      <View
        style={[
          styles.content,
          safe && {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: pulseColors.background },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  content: { flex: 1 },
});
