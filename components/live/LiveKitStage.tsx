import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  VideoTrack,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

import type { LiveKitMintRole } from '@/services/live/liveKitToken';

function LiveKitVideoFill({ role }: { role: LiveKitMintRole }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: role === 'viewer' });

  const trackRef = useMemo((): TrackReferenceOrPlaceholder | null => {
    if (!tracks.length) return null;
    if (role === 'host') {
      const local = tracks.find((t) => isTrackReference(t) && t.participant.isLocal);
      return local ?? tracks[0];
    }
    const remote = tracks.find((t) => isTrackReference(t) && !t.participant.isLocal);
    return remote ?? tracks.find((t) => isTrackReference(t)) ?? tracks[0];
  }, [tracks, role]);

  if (!trackRef || !isTrackReference(trackRef)) {
    return <View style={styles.videoFallback} />;
  }

  return (
    <VideoTrack style={styles.video} trackRef={trackRef} objectFit="cover" zOrder={0} mirror={role === 'host'} />
  );
}

export interface LiveKitStageProps {
  serverUrl: string;
  token: string;
  role: LiveKitMintRole;
  style?: StyleProp<ViewStyle>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (e: Error) => void;
}

/**
 * LiveKit room shell — host publishes camera/mic; viewers subscribe only.
 * Requires a dev/EAS build (WebRTC native modules); not supported in Expo Go.
 */
export function LiveKitStage({
  serverUrl,
  token,
  role,
  style,
  onConnected,
  onDisconnected,
  onError,
}: LiveKitStageProps) {
  useEffect(() => {
    void AudioSession.startAudioSession().catch((e) => {
      if (__DEV__) console.warn('[LiveKitStage] AudioSession', e);
    });
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  const publish = role === 'host';

  return (
    <View style={[styles.wrap, style]}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={Boolean(token && serverUrl)}
        audio={publish}
        video={publish}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
      >
        <LiveKitVideoFill role={role} />
      </LiveKitRoom>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#020617',
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  videoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
});
