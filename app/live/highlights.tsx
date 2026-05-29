import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipStudioScreen } from '@/components/live/clips/ClipStudioScreen';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { colors } from '@/theme';

/** Clip Studio — turn live markers into feed-ready clips. */
export default function LiveHighlightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { streamId } = useLocalSearchParams<{ streamId?: string }>();

  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }

  if (!streamId?.trim()) {
    return <Redirect href="/(tabs)/live" />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ClipStudioScreen streamId={streamId.trim()} onClose={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
});
