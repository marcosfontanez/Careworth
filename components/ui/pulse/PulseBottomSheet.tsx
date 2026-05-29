import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  pulseColors,
  pulseGradients,
  pulseRadius,
  pulseShadows,
  pulseSpacing,
  pulseTypography,
  pulseZIndex,
} from '@/lib/theme/pulseTheme';
import { PulseIconButton } from './PulseIconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

/** Premium glass bottom sheet — rounded top, header, close, safe-area. */
export function PulseBottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.72,
  style,
  scrollable = false,
}: Props) {
  const insets = useSafeAreaInsets();

  const body = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss sheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <Pressable
            style={[
              styles.sheet,
              pulseShadows.sheet,
              {
                maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
                paddingBottom: insets.bottom + pulseSpacing.md,
              },
              style,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient colors={[...pulseGradients.secondaryVeil]} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={[...pulseGradients.glassTop]} style={styles.topVeil} pointerEvents="none" />
            <View style={styles.handle} accessibilityLabel="Sheet handle" />
            {title ? (
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <PulseIconButton icon="close" onPress={onClose} accessibilityLabel="Close" size="sm" tone="ghost" />
              </View>
            ) : (
              <View style={styles.headerCloseOnly}>
                <PulseIconButton icon="close" onPress={onClose} accessibilityLabel="Close" size="sm" tone="ghost" />
              </View>
            )}
            <View style={styles.body}>{body}</View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: pulseColors.backdrop,
    justifyContent: 'flex-end',
    zIndex: pulseZIndex.sheet,
  },
  keyboardWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: pulseRadius.sheet,
    borderTopRightRadius: pulseRadius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: pulseColors.borderStrong,
    overflow: 'hidden',
    backgroundColor: pulseColors.glassStrong,
  },
  topVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: pulseSpacing.sm,
    marginBottom: pulseSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: pulseSpacing.lg,
    paddingBottom: pulseSpacing.sm,
    gap: pulseSpacing.sm,
  },
  headerCloseOnly: {
    alignItems: 'flex-end',
    paddingHorizontal: pulseSpacing.lg,
    paddingBottom: pulseSpacing.xs,
  },
  title: { ...pulseTypography.sectionTitle, flex: 1 },
  body: { paddingHorizontal: pulseSpacing.lg },
  scrollContent: { paddingBottom: pulseSpacing.lg, gap: pulseSpacing.md },
});
