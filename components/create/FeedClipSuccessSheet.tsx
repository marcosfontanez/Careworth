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
  processing: boolean;
  processingSlow?: boolean;
  processingFailed?: boolean;
  pinnedToMyPulse: boolean;
  circleName?: string | null;
  sourceLiveStreamId?: string | null;
  onViewFeed: () => void;
  onViewMyPulse?: () => void;
  onOpenCircle?: () => void;
  onOpenSourceLive?: () => void;
  onClipAnother: () => void;
  onClose: () => void;
};

/** Post-publish chooser for Feed-native clips. */
export function FeedClipSuccessSheet({
  visible,
  processing,
  processingSlow = false,
  processingFailed = false,
  pinnedToMyPulse,
  circleName,
  sourceLiveStreamId,
  onViewFeed,
  onViewMyPulse,
  onOpenCircle,
  onOpenSourceLive,
  onClipAnother,
  onClose,
}: Props) {
  const subtitle = processingFailed
    ? 'Clip encoding failed. This post will not appear in the Feed. You can try clipping again.'
    : processingSlow
      ? 'Still processing — your clip will appear in the Feed once encoding finishes. Check back in a minute.'
      : processing
        ? 'Your clip is processing — it will appear in the Feed when ready. Usually under a minute when the media worker is running.'
        : pinnedToMyPulse && circleName
      ? `Published to the Feed, pinned on My Pulse, and linked to ${circleName}.`
      : pinnedToMyPulse
        ? 'Published to the Feed and pinned on My Pulse.'
        : circleName
          ? `Published to the Feed and linked to ${circleName}.`
          : 'Your clip is on the Feed with creator attribution.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconRing}>
            <Ionicons
              name={processingFailed ? 'alert-circle-outline' : 'cut-outline'}
              size={28}
              color={processingFailed ? pulseColors.danger : pulseColors.teal}
            />
          </View>
          <Text style={styles.title}>
            {processingFailed
              ? 'Clip failed'
              : processingSlow
                ? 'Still processing'
                : processing
                  ? 'Processing clip'
                  : 'Clip published!'}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.actions}>
            {!processingFailed ? (
              <PulseButton label="View in Feed" onPress={onViewFeed} fullWidth />
            ) : null}
            {pinnedToMyPulse && onViewMyPulse ? (
              <PulseButton label="View on My Pulse" onPress={onViewMyPulse} variant="secondary" fullWidth />
            ) : null}
            {circleName && onOpenCircle ? (
              <PulseButton label={`Open ${circleName}`} onPress={onOpenCircle} variant="secondary" fullWidth />
            ) : null}
            {sourceLiveStreamId && onOpenSourceLive ? (
              <PulseButton label="View source Live" onPress={onOpenSourceLive} variant="secondary" fullWidth />
            ) : null}
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
