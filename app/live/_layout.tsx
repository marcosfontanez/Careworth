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
    </Stack>
  );
}
