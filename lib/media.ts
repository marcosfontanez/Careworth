import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export const VIDEO_MIN_SECONDS = 0;
export const VIDEO_MAX_SECONDS = 180;

export interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  duration?: number;
}

async function ensurePermission(type: 'camera' | 'library'): Promise<boolean> {
  if (type === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Please enable camera access in Settings to take photos and videos.');
      return false;
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo library access needed', 'Please enable photo library access in Settings to select media.');
      return false;
    }
  }
  return true;
}

/** `.mov` must map to quicktime — `video/mov` is invalid and breaks Storage / players */
function mimeForVideoExt(ext: string): string {
  switch (ext) {
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'webm':
      return 'video/webm';
    case '3gp':
    case '3gpp':
      return 'video/3gpp';
    case 'mp4':
    default:
      return 'video/mp4';
  }
}

/**
 * iOS default `VideoExportPreset.Passthrough` makes expo-image-picker copy the full `PHAsset`
 * and skip the file returned after the trim UI — the feed then plays the whole library clip.
 * Any non-passthrough preset forces the `mediaURL` path so uploads match what the user trimmed.
 *
 * We pick `H264_1920x1080` so the picker hands us a 1080p clip directly — saves a redundant
 * client-side downscale and avoids 4K bytes ever touching disk for in-app recordings.
 * @see expo-image-picker ios/MediaHandler.swift `handleVideo(mediaInfo:)` fast-path guard.
 */
const IOS_VIDEO_EXPORT_FOR_TRIM: Pick<
  ImagePicker.ImagePickerOptions,
  'videoExportPreset'
> =
  Platform.OS === 'ios'
    ? { videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080 }
    : {};

function assetFromResult(result: ImagePicker.ImagePickerResult): MediaAsset | null {
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const ext = asset.uri.split('.').pop()?.toLowerCase().split('?')[0] ?? (isVideo ? 'mp4' : 'jpg');

  let durationSec: number | undefined;
  if (asset.duration != null) {
    durationSec = asset.duration > 1000 ? asset.duration / 1000 : asset.duration;
  }

  return {
    uri: asset.uri,
    type: isVideo ? 'video' : 'image',
    mimeType: isVideo ? mimeForVideoExt(ext) : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    fileName: `${Date.now()}.${ext}`,
    width: asset.width,
    height: asset.height,
    duration: durationSec,
  };
}

export async function pickImageFromGallery(): Promise<MediaAsset | null> {
  const ok = await ensurePermission('library');
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  return assetFromResult(result);
}

export async function pickVideoFromGallery(): Promise<MediaAsset | null> {
  const ok = await ensurePermission('library');
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    quality: 0.8,
    videoMaxDuration: VIDEO_MAX_SECONDS,
    ...IOS_VIDEO_EXPORT_FOR_TRIM,
  });

  const asset = assetFromResult(result);
  if (asset && asset.duration != null && asset.duration > VIDEO_MAX_SECONDS) {
    Alert.alert(
      'Video Too Long',
      `Short-form videos can be up to ${VIDEO_MAX_SECONDS / 60} minutes. Try trimming it or go live for longer content!`,
    );
    return null;
  }
  return asset;
}

export async function recordVideo(): Promise<MediaAsset | null> {
  const ok = await ensurePermission('camera');
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    quality: 0.8,
    videoMaxDuration: VIDEO_MAX_SECONDS,
    ...IOS_VIDEO_EXPORT_FOR_TRIM,
  });

  const asset = assetFromResult(result);
  if (asset && asset.duration != null && asset.duration > VIDEO_MAX_SECONDS) {
    Alert.alert(
      'Video Too Long',
      `Short-form videos can be up to ${VIDEO_MAX_SECONDS / 60} minutes. Try trimming it or go live for longer content!`,
    );
    return null;
  }
  return asset;
}
