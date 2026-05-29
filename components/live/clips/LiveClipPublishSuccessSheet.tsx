import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseButton } from '@/components/ui/pulse/PulseButton';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

type Props = {
  visible: boolean;
  streamTitle?: string | null;
  onViewFeed: () => void;
  onOpenSourceLive: () => void;
  onClipAnother: () => void;
  onClose: () => void;
};

/** Post-publish chooser after Clip Studio publishes to the Feed. */
export function LiveClipPublishSuccessSheet({
  visible,
  streamTitle,
  onViewFeed,
  onOpenSourceLive,
  onClipAnother,
  onClose,
}: Props) {
  const subtitle = streamTitle?.trim()
    ? `Your clip from “${streamTitle.trim()}” is on the Feed with a “Clipped from Live” label.`
    : 'Your clip is on the Feed with a “Clipped from Live” label.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconRing}>
            <Ionicons name="cut-outline" size={28} color={pulseColors.teal} />
          </View>
          <Text style={styles.title}>Published!</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.actions}>
            <PulseButton label="View in Feed" onPress={onViewFeed} fullWidth />
            <PulseButton label="Open source Live" onPress={onOpenSourceLive} variant="secondary" fullWidth />
            <PulseButton label="Clip another" onPress={onClipAnother} variant="ghost" fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: pulseColors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: pulseRadius.sheet,
    borderTopRightRadius: pulseRadius.sheet,
    backgroundColor: pulseColors.glassStrong,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: pulseColors.borderAccent,
    paddingHorizontal: pulseSpacing.xl,
    paddingTop: pulseSpacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : pulseSpacing.xl,
    alignItems: 'center',
    gap: pulseSpacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: pulseSpacing.xs,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 211, 197, 0.12)',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  title: {
    ...pulseTypography.sectionTitle,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    ...pulseTypography.bodySmall,
    textAlign: 'center',
    maxWidth: 320,
    color: pulseColors.mutedText,
  },
  actions: {
    width: '100%',
    gap: pulseSpacing.sm,
    marginTop: pulseSpacing.sm,
  },
});
