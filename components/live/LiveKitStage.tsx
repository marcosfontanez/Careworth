import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Camera } from 'expo-camera';
import {
  AndroidAudioTypePresets,
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  useIOSAudioManagement,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import {
  LocalTrackPublication,
  MediaDeviceFailure,
  ParticipantEvent,
  RemoteAudioTrack,
  RemoteTrackPublication,
  RoomEvent,
  Track,
  type RemoteTrack,
} from 'livekit-client';

import { LiveBrbOverlay } from '@/components/live/LiveBrbOverlay';
import { liveKitAudioDebug } from '@/lib/live/liveKitAudioDebug';
import type { LiveKitMintRole } from '@/services/live/liveKitToken';

type AttachedRemote = {
  track: RemoteAudioTrack;
  element: HTMLMediaElement;
};

async function ensureHostAvPermissions(): Promise<{ mic: boolean; camera: boolean }> {
  const mic = await Camera.requestMicrophonePermissionsAsync();
  if (mic.status !== 'granted') {
    liveKitAudioDebug.permissionDenied('microphone');
    return { mic: false, camera: false };
  }
  const cam = await Camera.requestCameraPermissionsAsync();
  if (cam.status !== 'granted') {
    liveKitAudioDebug.permissionDenied('camera');
  }
  return { mic: true, camera: cam.status === 'granted' };
}

async function bootAudioSession(role: LiveKitMintRole): Promise<void> {
  if (role === 'host') {
    await AudioSession.configureAudio({
      android: {
        preferredOutputList: ['bluetooth', 'headset', 'speaker', 'earpiece'],
        audioTypeOptions: AndroidAudioTypePresets.communication,
      },
      ios: { defaultOutput: 'speaker' },
    });
  } else {
    await AudioSession.configureAudio({
      android: { audioTypeOptions: AndroidAudioTypePresets.media },
      ios: { defaultOutput: 'speaker' },
    });
  }
  await AudioSession.startAudioSession();
}

function LiveKitRemoteAudioPlayback({
  role,
  viewerAudioMuted,
}: {
  role: LiveKitMintRole;
  viewerAudioMuted: boolean;
}) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio], {
    onlySubscribed: true,
  });
  const attachedRef = useRef<AttachedRemote[]>([]);
  const viewerMutedRef = useRef(viewerAudioMuted);
  viewerMutedRef.current = viewerAudioMuted;

  const startPlayback = useCallback(async () => {
    if (role !== 'viewer' || !room) return;
    try {
      liveKitAudioDebug.startAudioInvoked();
      await room.startAudio();
    } catch (err) {
      liveKitAudioDebug.startAudioFailed(err);
    }
  }, [role, room]);

  useEffect(() => {
    if (role !== 'viewer' || !room) return;

    const onConnected = () => {
      liveKitAudioDebug.roomConnected('viewer');
      void startPlayback();
    };

    const onTrackSubscribed = (
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      participant: { identity: string },
    ) => {
      if (track.kind !== Track.Kind.Audio || participant.identity === room.localParticipant.identity) {
        return;
      }
      liveKitAudioDebug.remoteAudioSubscribed(participant.identity, track.sid);
      try {
        const element = track.attach() as HTMLMediaElement;
        attachedRef.current.push({ track: track as RemoteAudioTrack, element });
        if (track instanceof RemoteAudioTrack) {
          track.setVolume(viewerMutedRef.current ? 0 : 1);
        }
      } catch (err) {
        liveKitAudioDebug.attachRemoteFailed(err);
      }
      void startPlayback();
    };

    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    if (room.state === 'connected') {
      onConnected();
    }

    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      for (const { track, element } of attachedRef.current) {
        try {
          track.detach(element);
        } catch {
          /* ignore */
        }
      }
      attachedRef.current = [];
    };
  }, [role, room, startPlayback]);

  useEffect(() => {
    if (role !== 'viewer') return;
    for (const trackRef of tracks) {
      if (!isTrackReference(trackRef) || trackRef.participant.isLocal) continue;
      try {
        const pub = trackRef.publication;
        if (pub instanceof RemoteTrackPublication) {
          pub.setEnabled(!viewerAudioMuted);
        }
        const track = pub.track;
        if (track instanceof RemoteAudioTrack) {
          track.setVolume(viewerAudioMuted ? 0 : 1);
        }
        liveKitAudioDebug.trackMuted('audio', viewerAudioMuted, 'viewer-control');
      } catch (err) {
        if (__DEV__) console.warn('[LiveKitStage] viewer mute toggle', err);
      }
    }
    if (!viewerAudioMuted) {
      void startPlayback();
    }
  }, [tracks, viewerAudioMuted, role, startPlayback]);

  return null;
}

function LiveKitHostAvController({
  brbMode,
  micMuted,
  flipCameraNonce,
  onHostAudioPublished,
}: {
  brbMode: boolean;
  micMuted: boolean;
  flipCameraNonce?: number;
  onHostAudioPublished?: (published: boolean) => void;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const hostAudioReportedRef = useRef(false);
  const facingRef = useRef<'user' | 'environment'>('user');

  useEffect(() => {
    if (!localParticipant) return;
    void localParticipant.setCameraEnabled(!brbMode).catch((e) => {
      if (__DEV__) console.warn('[LiveKitStage] setCameraEnabled', e);
    });
  }, [localParticipant, brbMode]);

  useEffect(() => {
    if (!flipCameraNonce || !localParticipant || brbMode) return;
    facingRef.current = facingRef.current === 'user' ? 'environment' : 'user';
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const videoTrack = pub?.videoTrack as { restartTrack?: (opts: { facingMode: string }) => Promise<void> } | undefined;
    if (videoTrack?.restartTrack) {
      void videoTrack.restartTrack({ facingMode: facingRef.current }).catch((e) => {
        if (__DEV__) console.warn('[LiveKitStage] flipCamera restartTrack', e);
      });
    }
  }, [flipCameraNonce, localParticipant, brbMode]);

  useEffect(() => {
    if (!localParticipant) return;
    void localParticipant.setMicrophoneEnabled(!micMuted).catch((e) => {
      if (__DEV__) console.warn('[LiveKitStage] setMicrophoneEnabled', e);
    });
    liveKitAudioDebug.trackMuted('audio', micMuted, 'host-control');
  }, [localParticipant, micMuted]);

  useEffect(() => {
    if (!room) return;

    const onLocalPublished = (pub: LocalTrackPublication) => {
      if (pub.kind !== Track.Kind.Audio) return;
      liveKitAudioDebug.localAudioPublished(pub.trackSid);
      hostAudioReportedRef.current = true;
      onHostAudioPublished?.(true);
    };

    const onLocalUnpublished = (pub: LocalTrackPublication) => {
      if (pub.kind !== Track.Kind.Audio) return;
      onHostAudioPublished?.(false);
    };

    room.localParticipant.on(ParticipantEvent.LocalTrackPublished, onLocalPublished);
    room.localParticipant.on(ParticipantEvent.LocalTrackUnpublished, onLocalUnpublished);

    const hasAudio = room.localParticipant.audioTrackPublications.size > 0;
    if (hasAudio && !hostAudioReportedRef.current) {
      hostAudioReportedRef.current = true;
      onHostAudioPublished?.(true);
    }

    const warnTimer = setTimeout(() => {
      if (room.localParticipant.audioTrackPublications.size === 0) {
        liveKitAudioDebug.noHostAudioTrack();
        onHostAudioPublished?.(false);
      }
    }, 6000);

    return () => {
      clearTimeout(warnTimer);
      room.localParticipant.off(ParticipantEvent.LocalTrackPublished, onLocalPublished);
      room.localParticipant.off(ParticipantEvent.LocalTrackUnpublished, onLocalUnpublished);
    };
  }, [room, onHostAudioPublished]);

  useEffect(() => {
    if (isMicrophoneEnabled === undefined) return;
    liveKitAudioDebug.trackMuted('audio', !isMicrophoneEnabled, 'host-local-state');
  }, [isMicrophoneEnabled]);

  return null;
}

function LiveKitVideoFill({ role, hidden }: { role: LiveKitMintRole; hidden?: boolean }) {
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

  if (hidden) return null;

  if (!trackRef || !isTrackReference(trackRef)) {
    return <View style={styles.videoFallback} />;
  }

  return (
    <VideoTrack
      style={styles.video}
      trackRef={trackRef}
      objectFit="cover"
      zOrder={0}
      mirror={role === 'host'}
    />
  );
}

function LiveKitRoomContent({
  role,
  brbMode,
  micMuted,
  flipCameraNonce,
  viewerAudioMuted,
  onHostAudioPublished,
  onResumeFromBrb,
}: {
  role: LiveKitMintRole;
  brbMode: boolean;
  micMuted: boolean;
  flipCameraNonce?: number;
  viewerAudioMuted: boolean;
  onHostAudioPublished?: (published: boolean) => void;
  onResumeFromBrb?: () => void;
}) {
  const room = useRoomContext();
  useIOSAudioManagement(room, true);

  useEffect(() => {
    if (!room || role !== 'host') return;
    const onConnected = () => liveKitAudioDebug.roomConnected('host');
    room.on(RoomEvent.Connected, onConnected);
    if (room.state === 'connected') onConnected();
    return () => {
      room.off(RoomEvent.Connected, onConnected);
    };
  }, [room, role]);

  return (
    <>
      {role === 'host' ? (
        <LiveKitHostAvController
          brbMode={brbMode}
          micMuted={micMuted}
          flipCameraNonce={flipCameraNonce}
          onHostAudioPublished={onHostAudioPublished}
        />
      ) : null}
      {brbMode && role === 'host' ? (
        <LiveBrbOverlay showResume onResume={onResumeFromBrb} />
      ) : (
        <LiveKitVideoFill role={role} hidden={brbMode && role === 'host'} />
      )}
      <LiveKitRemoteAudioPlayback role={role} viewerAudioMuted={viewerAudioMuted} />
    </>
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
  brbMode?: boolean;
  micMuted?: boolean;
  viewerAudioMuted?: boolean;
  onMicPermissionDenied?: () => void;
  onHostAudioPublished?: (published: boolean) => void;
  flipCameraNonce?: number;
  onResumeFromBrb?: () => void;
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
  brbMode = false,
  micMuted = false,
  viewerAudioMuted = false,
  onMicPermissionDenied,
  onHostAudioPublished,
  flipCameraNonce,
  onResumeFromBrb,
}: LiveKitStageProps) {
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const [hostAvReady, setHostAvReady] = useState(role !== 'host');
  const [hostMicGranted, setHostMicGranted] = useState(role !== 'host');
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        await bootAudioSession(role);
        if (!cancelled) setAudioSessionReady(true);
      } catch (e) {
        if (__DEV__) console.warn('[LiveKitStage] AudioSession boot failed', e);
        if (!cancelled) setAudioSessionReady(true);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      void AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'host') {
      setHostAvReady(true);
      setHostMicGranted(true);
      setPermissionMessage(null);
      return;
    }

    let cancelled = false;
    void ensureHostAvPermissions()
      .then(({ mic, camera }) => {
        if (cancelled) return;
        if (!mic) {
          setHostAvReady(false);
          setHostMicGranted(false);
          setPermissionMessage('Microphone access is required to go live with audio.');
          onMicPermissionDenied?.();
          return;
        }
        setHostMicGranted(true);
        setHostAvReady(true);
        if (!camera) {
          setPermissionMessage(
            'Camera access is off — viewers may only hear you until camera is enabled in Settings.',
          );
        } else {
          setPermissionMessage(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (__DEV__) console.warn('[LiveKitStage] ensureHostAvPermissions', err);
        setHostAvReady(false);
        setHostMicGranted(false);
        setPermissionMessage('Could not access camera or microphone. Check Settings and try again.');
        onMicPermissionDenied?.();
      });

    return () => {
      cancelled = true;
    };
  }, [role, onMicPermissionDenied]);

  const canConnect =
    Boolean(token && serverUrl) && audioSessionReady && hostAvReady && (role !== 'host' || hostMicGranted);

  const publishAv = role === 'host' && hostMicGranted;

  const handleMediaDeviceFailure = useCallback(
    (failure?: MediaDeviceFailure, kind?: MediaDeviceKind) => {
      liveKitAudioDebug.mediaDeviceFailure(kind, failure);
      if (kind === 'audioinput' || failure === MediaDeviceFailure.PermissionDenied) {
        setPermissionMessage('Microphone access is required to broadcast audio.');
        onMicPermissionDenied?.();
      }
    },
    [onMicPermissionDenied],
  );

  return (
    <View style={[styles.wrap, style]}>
      {permissionMessage ? (
        <View style={styles.permissionBanner} pointerEvents="none">
          <Text style={styles.permissionBannerTxt}>{permissionMessage}</Text>
        </View>
      ) : null}
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={canConnect}
        audio={publishAv}
        video={publishAv && !brbMode}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
        onMediaDeviceFailure={handleMediaDeviceFailure}
      >
        <LiveKitRoomContent
          role={role}
          brbMode={brbMode}
          micMuted={micMuted}
          flipCameraNonce={flipCameraNonce}
          viewerAudioMuted={viewerAudioMuted}
          onHostAudioPublished={onHostAudioPublished}
          onResumeFromBrb={onResumeFromBrb}
        />
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
  permissionBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 30,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(127,29,29,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.35)',
  },
  permissionBannerTxt: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
