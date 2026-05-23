import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go host app — custom native modules (e.g. LiveKit WebRTC) are unavailable. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** LiveKit native bootstrap is only valid on iOS/Android dev/EAS builds — never web or Expo Go. */
export function shouldBootstrapLiveKitNative(): boolean {
  return Platform.OS !== 'web' && !isExpoGo();
}
