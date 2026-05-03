import { Platform } from 'react-native';
/** Legacy FS APIs — required on SDK 54+; root `expo-file-system` stubs throw for copy/read/delete. */
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/** Above this, base64-in-JS fallback is skipped to avoid OOM (short-form caps should stay well below). */
const MAX_BASE64_FALLBACK_BYTES = 120 * 1024 * 1024;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Materialize a remote-ish URI (`ph://`, `assets-library://`, `content://`, etc.) to a
 * plain `file://` path on disk. `FileSystem.uploadAsync` requires a real file path —
 * iOS picker URIs in particular will silently 0-byte through that API.
 */
async function ensureLocalFilePath(uri: string): Promise<{ path: string; cleanup: () => void }> {
  if (uri.startsWith('file://')) return { path: uri, cleanup: () => {} };

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error('Could not resolve cache directory for upload');
  const dest = `${cacheDir}cw-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return { path: dest, cleanup: () => FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {}) };
}

/**
 * Stream a local file straight to Supabase Storage's REST endpoint via the
 * native HTTP stack. Avoids ever loading the bytes into a JS string/Blob —
 * which is what blew up on 4K clips ("String length exceeds limit").
 *
 * @see https://supabase.com/docs/reference/api/storage-upload-file
 */
async function nativeStreamUpload(
  bucket: string,
  storagePath: string,
  fileUri: string,
  contentType: string,
  upsert: boolean,
): Promise<{ path: string }> {
  if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('You must be signed in to upload media.');

  const { path: localPath, cleanup } = await ensureLocalFilePath(fileUri);
  try {
    // Verify we actually have bytes — uploadAsync silently sends an empty body otherwise.
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists || info.isDirectory || !info.size || info.size <= 0) {
      throw new Error('Upload file is empty — could not read media from this device.');
    }

    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
    const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodedPath}`;

    const result = await FileSystem.uploadAsync(endpoint, localPath, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': contentType,
        'x-upsert': upsert ? 'true' : 'false',
        'Cache-Control': '3600',
      },
    });

    if (result.status >= 200 && result.status < 300) {
      // The endpoint returns `{ Key: "<bucket>/<path>" }`. We always know the path we POST'd to.
      return { path: storagePath };
    }

    const bodyText = (result.body || '').slice(0, 500);
    throw new Error(`Storage upload failed (${result.status}): ${bodyText || 'no body'}`);
  } finally {
    cleanup();
  }
}

/**
 * Load a local file URI as a Blob for Storage upload.
 * We avoid passing RN `FormData` into `@supabase/storage-js`: its upload path calls
 * `formData.has()`, which React Native's FormData does not implement, so uploads fail before networking.
 *
 * On native, `fetch(fileUri)` often returns **status 200 with a 0-byte body** (especially Android
 * `content://` URIs). We must treat empty blobs as failure and fall back to copy + read.
 */
async function fetchBlobIfNonEmpty(uri: string): Promise<Blob | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

async function xhrArrayBufferIfNonEmpty(uri: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const ab = xhr.response as ArrayBuffer;
        resolve(ab && ab.byteLength > 0 ? ab : null);
      };
      xhr.onerror = () => resolve(null);
      xhr.responseType = 'arraybuffer';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } catch {
      resolve(null);
    }
  });
}

async function blobFromBase64File(uri: string, mimeType: string): Promise<Blob> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Cannot decode file for upload on this runtime');
  }
  const binary = globalThis.atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function uriToBlobNative(uri: string, mimeType: string): Promise<Blob> {
  const direct = await fetchBlobIfNonEmpty(uri);
  if (direct) return direct;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error('Could not resolve cache directory for upload');

  const dest = `${cacheDir}cw-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });

  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists || info.isDirectory || !info.size || info.size <= 0) {
      throw new Error('Could not read video file from the device (empty or inaccessible).');
    }

    const fromCopy = await fetchBlobIfNonEmpty(dest);
    if (fromCopy) return fromCopy;

    const fromXhr = await xhrArrayBufferIfNonEmpty(dest);
    if (fromXhr) {
      return new Blob([fromXhr], { type: mimeType });
    }

    if (info.size <= MAX_BASE64_FALLBACK_BYTES) {
      return blobFromBase64File(dest, mimeType);
    }

    throw new Error(
      'Could not read video bytes for upload. Try recording again or pick a shorter clip.',
    );
  } finally {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
  }
}

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  postMedia: 'post-media',
  collabClips: 'collab-clips',
  communityBanners: 'community-banners',
  employerLogos: 'employer-logos',
} as const;

const PUBLIC_POST_MEDIA_MARKER = '/object/public/post-media/';

/**
 * If playback fails on a public URL (e.g. bucket not public), try a time-limited signed URL
 * when the path is under `post-media` and the user may read the object per RLS.
 */
export async function trySignedUrlFromPostMediaPublicUrl(publicUrl: string): Promise<string | null> {
  const u = publicUrl.trim();
  const idx = u.indexOf(PUBLIC_POST_MEDIA_MARKER);
  if (idx === -1) return null;
  const rawPath = u.slice(idx + PUBLIC_POST_MEDIA_MARKER.length).split('?')[0];
  const path = decodeURIComponent(rawPath);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.postMedia)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Use for downloads / `FileSystem.downloadAsync` when a public object URL may 403 but the user can read via RLS.
 * Falls back to the original string when signing does not apply or fails.
 */
export async function resolvePostMediaDownloadUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const signed = await trySignedUrlFromPostMediaPublicUrl(trimmed);
  return signed ?? trimmed;
}

/**
 * Supabase Storage Image Transformations.
 *
 * Rewrites a public-object URL like:
 *   https://<proj>.supabase.co/storage/v1/object/public/avatars/u/123.jpg
 * into the on-the-fly transform endpoint:
 *   https://<proj>.supabase.co/storage/v1/render/image/public/avatars/u/123.jpg?width=200&quality=70&resize=cover
 *
 * We're already paying for Supabase Pro which includes image transformations,
 * so a 1080×1080 avatar rendered at 48px shouldn't ship 400 KB of pixels —
 * it should ship ~6 KB of resized WebP. Major bandwidth savings on every list
 * view (feed avatars, leaderboard rows, comments, recent-media thumbs).
 *
 * Safe-by-design:
 * - Returns the original URL untouched if it's not a Supabase public-object URL
 *   (third-party CDN images, signed URLs, local file URIs, empty strings).
 * - Returns the original URL untouched if the path looks like a video — the
 *   transform endpoint only handles still images and would 400.
 * - Existing query strings on the source URL are preserved.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export interface SupabaseImageTransformOpts {
  /** Target width in CSS px. Multiply by `PixelRatio.get()` if you want a 2× / 3× crisp render. */
  width?: number;
  /** Target height in CSS px. Omit to preserve aspect ratio against `width`. */
  height?: number;
  /** 20–100. Defaults to 70 — a good visual/bandwidth balance for avatars and thumbs. */
  quality?: number;
  /**
   * How to fit into the requested box. `cover` (default) crops, `contain`
   * letterboxes, `fill` stretches. Avatars want `cover`; full-bleed photos
   * usually want `contain`.
   */
  resize?: 'cover' | 'contain' | 'fill';
}

const PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';
const RENDER_IMAGE_MARKER = '/storage/v1/render/image/public/';
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', '3gp', 'm3u8', 'ts', 'mkv']);

export function withSupabaseImageTransform(
  url: string | null | undefined,
  opts: SupabaseImageTransformOpts = {},
): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';

  const idx = raw.indexOf(PUBLIC_OBJECT_MARKER);
  if (idx === -1) {
    // Not a Supabase public-object URL (signed URL, third-party CDN, file://, etc.).
    return raw;
  }

  // Extract path + existing query so we can rebuild via the render endpoint.
  const [pathOnly, existingQuery = ''] = raw.slice(idx + PUBLIC_OBJECT_MARKER.length).split('?');
  const ext = pathOnly.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_EXTS.has(ext)) {
    // Image transforms don't apply to video objects — return the original URL.
    return raw;
  }

  const origin = raw.slice(0, idx);
  const params = new URLSearchParams(existingQuery);

  if (opts.width != null && opts.width > 0) {
    params.set('width', String(Math.round(opts.width)));
  }
  if (opts.height != null && opts.height > 0) {
    params.set('height', String(Math.round(opts.height)));
  }
  const q = opts.quality ?? 70;
  if (q >= 20 && q <= 100) params.set('quality', String(Math.round(q)));
  params.set('resize', opts.resize ?? 'cover');

  return `${origin}${RENDER_IMAGE_MARKER}${pathOnly}?${params.toString()}`;
}

/**
 * Convenience wrapper for square avatars. Pass the on-screen pixel size you
 * want and we'll render at 2× density so it stays crisp on Retina displays
 * without overshooting bandwidth.
 *
 * Example: `avatarThumb(post.creator.avatarUrl, 48)` → ~96px image.
 */
export function avatarThumb(url: string | null | undefined, sizeCssPx: number): string {
  const targetPx = Math.max(32, Math.round(sizeCssPx * 2));
  return withSupabaseImageTransform(url, {
    width: targetPx,
    height: targetPx,
    quality: 70,
    resize: 'cover',
  });
}

/**
 * Convenience wrapper for rectangular media thumbnails (recent posts grid,
 * pics card, leaderboard banners, etc.). Quality dialled slightly higher
 * than avatars because thumbs are scrolled past slowly and detail matters.
 */
export function mediaThumb(url: string | null | undefined, widthCssPx: number, heightCssPx?: number): string {
  return withSupabaseImageTransform(url, {
    width: Math.round(widthCssPx * 2),
    height: heightCssPx != null ? Math.round(heightCssPx * 2) : undefined,
    quality: 75,
    resize: 'cover',
  });
}

function fileExtForUpload(file: { uri: string; type?: string; name?: string }): string {
  const fromName = file.name?.split('.').pop()?.toLowerCase().split('?')[0];
  if (fromName && /^[a-z0-9]{2,5}$/i.test(fromName)) return fromName;
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) {
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    if (t.includes('gif')) return 'gif';
    return 'jpg';
  }
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('webm')) return 'webm';
  if (t.includes('3gpp') || t.includes('3gp')) return '3gp';
  const uriExt = file.uri.split('.').pop()?.toLowerCase().split('?')[0];
  if (uriExt && /^[a-z0-9]{2,5}$/i.test(uriExt)) return uriExt;
  return 'mp4';
}

async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Failed to load file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file for upload'));
    reader.onloadend = () => {
      const r = reader.result;
      if (r instanceof ArrayBuffer) resolve(r);
      else reject(new Error('Could not read file for upload'));
    };
    reader.readAsArrayBuffer(blob);
  });
}

async function uploadFile(
  bucket: string,
  path: string,
  file: { uri: string; type?: string; name?: string },
  options?: { upsert?: boolean },
) {
  const contentType = file.type || 'application/octet-stream';
  const upsert = options?.upsert ?? false;

  if (Platform.OS === 'web') {
    const blob = await uriToBlob(file.uri);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert });

    if (error) throw error;
    return data;
  }

  // Preferred path on native: stream the file with the OS HTTP stack so we never
  // hold the whole video in JS memory. Fixes "RangeError: String length exceeds limit"
  // on large clips (the old base64/atob fallback bursts past Hermes' string cap).
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return nativeStreamUpload(bucket, path, file.uri, contentType, upsert);
  }

  // Fallback (dev environments missing EXPO_PUBLIC_SUPABASE_URL): use the old
  // blob/ArrayBuffer route. Will still throw on >256 MB files, but at least it works
  // for small images/avatars.
  const blob = await uriToBlobNative(file.uri, contentType);
  if (!blob || blob.size <= 0) {
    throw new Error('Upload file is empty — could not read media from this device.');
  }

  /**
   * Supabase Storage JS builds FormData from Blob uploads; React Native FormData + Blob is unreliable.
   * Official guidance: upload `ArrayBuffer` with `contentType` on native.
   * @see https://github.com/supabase/supabase-js/blob/master/packages/storage-js/src/packages/StorageFileApi.ts
   */
  const body = await blobToArrayBuffer(blob);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert });

  if (error) throw error;
  return data;
}

export const storageService = {
  async uploadAvatar(userId: string, file: { uri: string; type?: string; name?: string }) {
    const ext = fileExtForUpload(file);
    const path = `${userId}/${Date.now()}.${ext}`;
    const data = await uploadFile(STORAGE_BUCKETS.avatars, path, file, { upsert: true });

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.avatars)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /** Wide banner for My Pulse — uses same bucket as post media. */
  async uploadProfileBanner(userId: string, file: { uri: string; type?: string; name?: string }) {
    return this.uploadPostMedia(userId, file);
  },

  async uploadPostMedia(userId: string, file: { uri: string; type?: string; name?: string }) {
    const ext = fileExtForUpload(file);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const data = await uploadFile(STORAGE_BUCKETS.postMedia, path, file);

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.postMedia)
      .getPublicUrl(data.path);

    const url = urlData.publicUrl?.trim();
    if (!url) throw new Error('Storage returned no public URL');
    return url;
  },

  /**
   * Co-create slot clip — path segments must match migration 096 RLS:
   * `{inviteeUserId}/{projectId}/{slotId}/{file}`.
   * Returns the **object path** (not URL) for `collab_slots.submitted_storage_path`.
   */
  async uploadCollabSlotClip(args: {
    inviteeUserId: string;
    projectId: string;
    slotId: string;
    file: { uri: string; type?: string; name?: string };
  }): Promise<string> {
    const ext = fileExtForUpload(args.file);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${args.inviteeUserId}/${args.projectId}/${args.slotId}/${fileName}`;
    const data = await uploadFile(STORAGE_BUCKETS.collabClips, path, args.file, { upsert: false });
    return data.path;
  },

  collabClipPublicUrl(storagePath: string) {
    const { data } = supabase.storage.from(STORAGE_BUCKETS.collabClips).getPublicUrl(storagePath);
    return data.publicUrl?.trim() ?? '';
  },

  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
