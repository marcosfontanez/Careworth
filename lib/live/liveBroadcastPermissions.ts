import * as Linking from 'expo-linking';
import { Camera, type PermissionResponse } from 'expo-camera';

export type LiveBroadcastPermissionKind = 'camera' | 'microphone';

export type LiveBroadcastPermissionState = {
  camera: PermissionResponse;
  microphone: PermissionResponse;
  allGranted: boolean;
  missing: LiveBroadcastPermissionKind[];
  /** Denied and OS will not show the system prompt again — user must open Settings. */
  blocked: LiveBroadcastPermissionKind[];
  /** Can still show the native permission prompt. */
  requestable: LiveBroadcastPermissionKind[];
};

function normalize(camera: PermissionResponse, microphone: PermissionResponse): LiveBroadcastPermissionState {
  const missing: LiveBroadcastPermissionKind[] = [];
  const blocked: LiveBroadcastPermissionKind[] = [];
  const requestable: LiveBroadcastPermissionKind[] = [];

  const inspect = (kind: LiveBroadcastPermissionKind, res: PermissionResponse) => {
    if (res.granted) return;
    missing.push(kind);
    if (res.status === 'denied' && res.canAskAgain === false) {
      blocked.push(kind);
      return;
    }
    if (res.status === 'undetermined' || res.canAskAgain !== false) {
      requestable.push(kind);
    }
  };

  inspect('camera', camera);
  inspect('microphone', microphone);

  return {
    camera,
    microphone,
    allGranted: missing.length === 0,
    missing,
    blocked,
    requestable,
  };
}

function devLog(phase: string, state: LiveBroadcastPermissionState) {
  if (!__DEV__) return;
  console.log('[liveBroadcastPermissions]', phase, {
    camera: state.camera.status,
    microphone: state.microphone.status,
    allGranted: state.allGranted,
    missing: state.missing,
    blocked: state.blocked,
    requestable: state.requestable,
  });
}

/** Read current camera + microphone permission without prompting. */
export async function checkLiveBroadcastPermissions(): Promise<LiveBroadcastPermissionState> {
  const [camera, microphone] = await Promise.all([
    Camera.getCameraPermissionsAsync(),
    Camera.getMicrophonePermissionsAsync(),
  ]);
  const state = normalize(camera, microphone);
  devLog('check', state);
  return state;
}

/** Request any permissions that are still undetermined (or denied-but-askable). */
export async function requestLiveBroadcastPermissions(): Promise<LiveBroadcastPermissionState> {
  let camera = await Camera.getCameraPermissionsAsync();
  let microphone = await Camera.getMicrophonePermissionsAsync();

  if (!camera.granted && (camera.status === 'undetermined' || camera.canAskAgain !== false)) {
    camera = await Camera.requestCameraPermissionsAsync();
  }
  if (!microphone.granted && (microphone.status === 'undetermined' || microphone.canAskAgain !== false)) {
    microphone = await Camera.requestMicrophonePermissionsAsync();
  }

  const state = normalize(camera, microphone);
  devLog('request', state);
  return state;
}

/** Opens the PulseVerse page in system Settings (iOS / Android). */
export async function openAppSettings(): Promise<boolean> {
  try {
    await Linking.openSettings();
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[liveBroadcastPermissions.openAppSettings]', err);
    return false;
  }
}

export function missingPermissionLabel(missing: LiveBroadcastPermissionKind[]): string {
  const hasCamera = missing.includes('camera');
  const hasMic = missing.includes('microphone');
  if (hasCamera && hasMic) return 'Camera and Microphone';
  if (hasCamera) return 'Camera';
  if (hasMic) return 'Microphone';
  return 'Camera and Microphone';
}
