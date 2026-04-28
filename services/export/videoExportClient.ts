import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { resolvePostMediaDownloadUrl } from '@/lib/storage';
import type { Post } from '@/types';
import { buildExportEndCardForPost } from '@/services/export/buildExportEndCardForPost';
import type { ExportEndCardData } from '@/types/exportEndCard';

const EXPORT_PATH = '/v1/video-export';
const JOB_STATUS_PATH = '/v1/video-export/jobs';

export type VideoExportJobRequestBody = {
  sourceVideoUrl: string;
  endCard: ExportEndCardData;
  anonymousExport: boolean;
  postId: string;
  burnWatermark: boolean;
};

/** Immediate completion (worker finished inside the HTTP request). */
export type VideoExportSyncResponse = {
  outputUrl: string;
};

/** Async job — poll until completed. */
export type VideoExportAsyncResponse = {
  jobId: string;
};

export type VideoExportJobStatusBody = {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  /** Optional 0–1 for determinate progress UI */
  progress?: number;
  error?: string;
};

export type BrandedExportPhase = 'submitting' | 'queued' | 'encoding' | 'downloading';

export type BrandedExportProgress = {
  phase: BrandedExportPhase;
  /** 0–1 when known; null = indeterminate */
  progress: number | null;
};

export type RequestBrandedVideoOptions = {
  onProgress?: (p: BrandedExportProgress) => void;
  signal?: AbortSignal;
};

function videoExportBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_VIDEO_EXPORT_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

function makeAbortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw makeAbortError();
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      signal?.removeEventListener('abort', onAbort);
      reject(makeAbortError());
    };
    signal?.addEventListener('abort', onAbort);
  });
}

async function pollJobUntilOutputUrl(
  base: string,
  jobId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
  onProgress: RequestBrandedVideoOptions['onProgress'],
): Promise<string> {
  // Match the worker's hard ffmpeg timeout (6 min) plus headroom for upload + queue.
  // A long 4K-source clip on a shared CPU can legitimately take 4-5 minutes to encode.
  const deadline = Date.now() + 7 * 60_000;
  while (Date.now() < deadline) {
    assertNotAborted(signal);
    const r = await fetch(`${base}${JOB_STATUS_PATH}/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(t || `Export status failed (${r.status})`);
    }
    const j = (await r.json()) as VideoExportJobStatusBody;
    if (j.status === 'failed') {
      throw new Error(j.error?.trim() || 'Export failed');
    }
    if (j.status === 'completed' && j.outputUrl?.trim()) {
      return j.outputUrl.trim();
    }
    const p = typeof j.progress === 'number' && j.progress >= 0 && j.progress <= 1 ? j.progress : null;
    onProgress?.({
      phase: j.status === 'queued' ? 'queued' : 'encoding',
      progress: p ?? (j.status === 'queued' ? 0.12 : 0.35),
    });
    await sleep(1600, signal);
  }
  throw new Error('Export timed out');
}

async function downloadVideoWithProgress(
  outputUrl: string,
  dest: string,
  onProgress: RequestBrandedVideoOptions['onProgress'],
): Promise<string> {
  const dr = FileSystem.createDownloadResumable(
    outputUrl,
    dest,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      if (totalBytesExpectedToWrite != null && totalBytesExpectedToWrite > 0) {
        const frac = totalBytesWritten / totalBytesExpectedToWrite;
        onProgress?.({ phase: 'downloading', progress: 0.55 + Math.min(1, frac) * 0.38 });
      } else {
        onProgress?.({ phase: 'downloading', progress: null });
      }
    },
  );
  const result = await dr.downloadAsync();
  if (!result?.uri) throw new Error('Download finished without a file');
  return result.uri;
}

/**
 * POST export job, then either use immediate `outputUrl` or poll `jobId`.
 * Downloads result to cache with progress callbacks.
 */
export async function requestBrandedVideoFile(
  post: Post,
  remoteMediaUrl: string,
  opts: RequestBrandedVideoOptions = {},
): Promise<string | null> {
  const { onProgress, signal } = opts;
  const base = videoExportBaseUrl();
  if (!base || post.type !== 'video') return null;

  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) return null;

  assertNotAborted(signal);
  onProgress?.({ phase: 'submitting', progress: 0.08 });

  const sourceVideoUrl = await resolvePostMediaDownloadUrl(remoteMediaUrl);
  const endCard = buildExportEndCardForPost(post);
  const body: VideoExportJobRequestBody = {
    sourceVideoUrl,
    endCard,
    anonymousExport: post.isAnonymous === true,
    postId: post.id,
    burnWatermark: true,
  };

  const res = await fetch(`${base}${EXPORT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Export failed (${res.status})`);
  }

  const json = (await res.json()) as VideoExportSyncResponse | VideoExportAsyncResponse;

  let outputUrl: string | null = null;
  if ('outputUrl' in json && json.outputUrl?.trim()) {
    outputUrl = json.outputUrl.trim();
    onProgress?.({ phase: 'encoding', progress: 0.45 });
  } else if ('jobId' in json && json.jobId?.trim()) {
    onProgress?.({ phase: 'queued', progress: 0.15 });
    outputUrl = await pollJobUntilOutputUrl(base, json.jobId.trim(), session.access_token, signal, onProgress);
  }

  if (!outputUrl) {
    throw new Error('Export response missing outputUrl or jobId');
  }

  assertNotAborted(signal);
  onProgress?.({ phase: 'downloading', progress: 0.55 });

  const outName = `pulseverse-export-${post.id.replace(/[^a-zA-Z0-9-_]/g, '')}.mp4`;
  const dest = `${FileSystem.cacheDirectory ?? ''}${outName}`;

  return downloadVideoWithProgress(outputUrl, dest, onProgress);
}

export function isVideoExportConfigured(): boolean {
  return Boolean(videoExportBaseUrl());
}
