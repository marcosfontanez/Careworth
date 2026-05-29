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
  scheduled: boolean;
  pinnedToMyPulse: boolean;
  circleName?: string | null;
  onViewFeed: () => void;
  onViewScheduled?: () => void;
  onViewMyPulse?: () => void;
  onOpenCircle?: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
};

/** Lightweight post-upload chooser — where the video landed. */
export function VideoPublishSuccessSheet({
  visible,
  scheduled,
  pinnedToMyPulse,
  circleName,
  onViewFeed,
  onViewScheduled,
  onViewMyPulse,
  onOpenCircle,
  onCreateAnother,
  onClose,
}: Props) {
  const title = scheduled ? 'Scheduled!' : 'Posted!';
  const subtitle = scheduled
    ? 'Your video will go live at the scheduled time.'
    : pinnedToMyPulse && circleName
      ? `Shared to the Feed, pinned on My Pulse, and linked to ${circleName}.`
      : pinnedToMyPulse
        ? 'Shared to the Feed and pinned on My Pulse.'
        : circleName
          ? `Shared to the Feed and linked to ${circleName}.`
          : 'Your video is live on the Feed.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconRing}>
            <Ionicons name="checkmark-circle" size={32} color={pulseColors.teal} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.actions}>
            {scheduled && onViewScheduled ? (
              <PulseButton label="View scheduled posts" onPress={onViewScheduled} fullWidth />
            ) : !scheduled ? (
              <PulseButton label="View in Feed" onPress={onViewFeed} fullWidth />
            ) : null}
            {pinnedToMyPulse && onViewMyPulse ? (
              <PulseButton label="View on My Pulse" onPress={onViewMyPulse} variant="secondary" fullWidth />
            ) : null}
            {circleName && onOpenCircle ? (
              <PulseButton label={`Open ${circleName}`} onPress={onOpenCircle} variant="secondary" fullWidth />
            ) : null}
            <PulseButton label="Create another" onPress={onCreateAnother} variant="ghost" fullWidth />
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
