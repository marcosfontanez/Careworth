import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

/** Minimum clip length for short-form posts (picker + composer gate when duration is known). */
export const VIDEO_MIN_SECONDS = 1;
export const VIDEO_MAX_SECONDS = 180;

/** expo-image-picker: duration may be seconds or milliseconds depending on platform/asset. */
export function normalizePickerVideoDurationSeconds(raw: number | null | undefined): number | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined;
  return raw > 1000 ? raw / 1000 : raw;
}

export interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  duration?: number;
  /** Web-only: keep bytes in memory — `blob:` URIs are revoked after navigation. */
  webBlob?: Blob;
}

/** Best-effort — stale blob / cache-evicted files return false before upload/post. */
export async function isMediaUriReadable(
  uri: string,
  webBlob?: Blob,
): Promise<boolean> {
  if (webBlob) return webBlob.size > 0;
  const u = uri.trim();
  if (!u) return false;
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      return res.ok || res.status === 206;
    } catch {
      return false;
    }
  }
  try {
    const info = await FileSystem.getInfoAsync(u);
    return Boolean(info.exists);
  } catch {
    return true;
  }
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

function extFromPickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  isVideo: boolean,
): string {
  const mime = asset.mimeType?.toLowerCase() ?? '';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4v')) return 'mp4';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  const uri = asset.uri;
  if (uri.startsWith('blob:') || uri.startsWith('data:')) {
    return isVideo ? 'mp4' : 'jpg';
  }
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0];
  if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) return ext;
  return isVideo ? 'mp4' : 'jpg';
}

async function materializeWebBlob(uri: string): Promise<Blob | undefined> {
  if (Platform.OS !== 'web' || !uri.startsWith('blob:')) return undefined;
  try {
    const res = await fetch(uri);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return blob.size > 0 ? blob : undefined;
  } catch {
    return undefined;
  }
}

async function finalizeMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
  if (Platform.OS !== 'web' || asset.webBlob?.size) return asset;
  const webBlob = await materializeWebBlob(asset.uri);
  return webBlob ? { ...asset, webBlob } : asset;
}

export async function ensureMediaWebBlob(asset: MediaAsset): Promise<MediaAsset> {
  return finalizeMediaAsset(asset);
}

function assetFromResult(result: ImagePicker.ImagePickerResult): MediaAsset | null {
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const ext = extFromPickerAsset(asset, isVideo);
  const pickerMime = asset.mimeType?.trim();

  const durationSec =
    isVideo ? normalizePickerVideoDurationSeconds(asset.duration) : undefined;

  return {
    uri: asset.uri,
    type: isVideo ? 'video' : 'image',
    mimeType:
      pickerMime ||
      (isVideo ? mimeForVideoExt(ext) : `image/${ext === 'jpg' ? 'jpeg' : ext}`),
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

/** Max long edge after resize — keeps uploads small and avoids odd HEIC/PNG paths on Storage. */
const PROFILE_AVATAR_MAX_EDGE = 1536;
const PROFILE_BANNER_MAX_EDGE = 2560;

/**
 * Re-encode to JPEG and downscale if huge so Storage + RLS always see a normal raster payload.
 */
export async function normalizeRasterForUpload(asset: MediaAsset, kind: 'avatar' | 'banner'): Promise<MediaAsset> {
  if (asset.type !== 'image') return asset;

  const maxPrimary = kind === 'avatar' ? PROFILE_AVATAR_MAX_EDGE : PROFILE_BANNER_MAX_EDGE;
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;

  const actions: ImageManipulator.Action[] = [];
  if (w > 0 && h > 0) {
    const long = Math.max(w, h);
    if (long > maxPrimary) {
      const ratio = maxPrimary / long;
      actions.push({
        resize: {
          width: Math.max(1, Math.round(w * ratio)),
          height: Math.max(1, Math.round(h * ratio)),
        },
      });
    }
  } else {
    /** Unknown dimensions (some library URIs): force a bounded decode so HEIC/PNG always become normal JPEG rasters before Storage. */
    actions.push({ resize: { width: maxPrimary } });
  }

  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: kind === 'avatar' ? 0.9 : 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    ...asset,
    uri: result.uri,
    mimeType: 'image/jpeg',
    fileName: `${Date.now()}.jpg`,
    width: result.width,
    height: result.height,
  };
}

/**
 * Picks a full-resolution still (no native square crop). Open {@link CircularAvatarCropModal}
 * so the visible circle matches in-app avatars, then call {@link normalizeRasterForUpload} before Storage.
 */
export async function pickAvatarImageRawFromGallery(): Promise<MediaAsset | null> {
  const ok = await ensurePermission('library');
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  const asset = assetFromResult(result);
  if (!asset || asset.type !== 'image') return null;
  return asset;
}

/**
 * @deprecated Prefer {@link pickAvatarImageRawFromGallery} + {@link CircularAvatarCropModal} +
 * {@link normalizeRasterForUpload} so avatars match the circular display everywhere.
 */
export async function pickAvatarImageFromGallery(): Promise<MediaAsset | null> {
  const raw = await pickAvatarImageRawFromGallery();
  if (!raw) return null;
  return normalizeRasterForUpload(raw, 'avatar');
}

/** Wide crop (~3:1) + JPEG + cap — My Pulse banner. */
export async function pickBannerImageFromGallery(): Promise<MediaAsset | null> {
  const ok = await ensurePermission('library');
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    ...(Platform.OS === 'android' ? { aspect: [3, 1] as [number, number] } : {}),
    quality: 1,
  });

  const asset = assetFromResult(result);
  if (!asset || asset.type !== 'image') return null;
  return normalizeRasterForUpload(asset, 'banner');
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
  if (asset?.type === 'video' && asset.duration != null) {
    if (asset.duration < VIDEO_MIN_SECONDS) {
      Alert.alert(
        'Clip too short',
        `Short-form clips need to be at least ${VIDEO_MIN_SECONDS}s. Pick a slightly longer moment or trim elsewhere.`,
      );
      return null;
    }
    if (asset.duration > VIDEO_MAX_SECONDS) {
      Alert.alert(
        'Video Too Long',
        `Short-form videos can be up to ${VIDEO_MAX_SECONDS / 60} minutes. Try trimming it or go live for longer content!`,
      );
      return null;
    }
  }
  return asset ? finalizeMediaAsset(asset) : null;
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
  if (asset?.type === 'video' && asset.duration != null) {
    if (asset.duration < VIDEO_MIN_SECONDS) {
      Alert.alert(
        'Clip too short',
        `Short-form clips need to be at least ${VIDEO_MIN_SECONDS}s. Record a slightly longer take.`,
      );
      return null;
    }
    if (asset.duration > VIDEO_MAX_SECONDS) {
      Alert.alert(
        'Video Too Long',
        `Short-form videos can be up to ${VIDEO_MAX_SECONDS / 60} minutes. Try trimming it or go live for longer content!`,
      );
      return null;
    }
  }
  return asset ? finalizeMediaAsset(asset) : null;
}
