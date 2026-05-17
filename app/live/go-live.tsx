import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors } from '@/theme';
import { GoLiveWizard } from '@/components/live/go-live/GoLiveWizard';
import { isFeatureEnabled } from '@/lib/featureFlags';

export default function GoLiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Go Live"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />
      <GoLiveWizard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
});
