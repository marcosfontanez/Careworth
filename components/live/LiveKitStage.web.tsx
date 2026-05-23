import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { LiveKitMintRole } from '@/services/live/liveKitToken';

export interface LiveKitStageProps {
  serverUrl: string;
  token: string;
  role: LiveKitMintRole;
  style?: StyleProp<ViewStyle>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (e: Error) => void;
  brbMode?: boolean;
  micMuted?: boolean;
  viewerAudioMuted?: boolean;
  onMicPermissionDenied?: () => void;
  onHostAudioPublished?: (published: boolean) => void;
  flipCameraNonce?: number;
  onResumeFromBrb?: () => void;
}

/**
 * Web export / marketing iframe — LiveKit native WebRTC is unavailable.
 * Keeps `/live/[id]` from lazy-loading `@livekit/react-native` on web.
 */
export function LiveKitStage({ style, onDisconnected }: LiveKitStageProps) {
  useEffect(() => {
    onDisconnected?.();
  }, [onDisconnected]);

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>Live in the app</Text>
      <Text style={styles.body}>
        PulseVerse Live uses native video on iOS and Android. Open the app to watch or host streams.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(148,163,184,0.92)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
});
