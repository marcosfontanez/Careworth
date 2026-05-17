import { Stack, Redirect } from 'expo-router';
import { isFeatureEnabled } from '@/lib/featureFlags';

export default function LiveLayout() {
  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="go-live" options={{ presentation: 'modal' }} />
      <Stack.Screen name="host-controls" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="highlights" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
