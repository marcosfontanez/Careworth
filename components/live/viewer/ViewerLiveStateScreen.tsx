import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  PulseButton,
  PulseEmptyState,
  PulseErrorState,
  PulseIconButton,
  PulseScreen,
} from '@/components/ui/pulse';
import { pulseSpacing } from '@/lib/theme/pulseTheme';

type Props = {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof PulseEmptyState>['icon'];
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
  tone?: 'default' | 'error' | 'muted';
};

/** Full-screen viewer states — ended, unavailable, blocked, etc. */
export function ViewerLiveStateScreen({
  title,
  message,
  icon = 'radio-outline',
  actionLabel,
  onAction,
  onBack,
  tone = 'default',
}: Props) {
  return (
    <PulseScreen style={styles.wrap}>
      {onBack ? (
        <PulseIconButton
          icon="chevron-back"
          onPress={onBack}
          accessibilityLabel="Back"
          size="sm"
          tone="ghost"
          style={styles.backBtn}
        />
      ) : null}
      <View style={styles.center}>
        {tone === 'error' ? (
          <PulseErrorState
            title={title}
            message={message}
            retryLabel={actionLabel}
            onRetry={onAction}
          />
        ) : (
          <PulseEmptyState
            icon={icon}
            title={title}
            message={message}
            actionLabel={actionLabel}
            onAction={onAction}
          />
        )}
      </View>
    </PulseScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: pulseSpacing.xl },
  backBtn: { marginTop: pulseSpacing.sm, alignSelf: 'flex-start' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: pulseSpacing['5xl'],
  },
});
