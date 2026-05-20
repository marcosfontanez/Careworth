import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True when running inside the Expo Go host app — custom native modules (e.g. LiveKit WebRTC) are unavailable. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
