import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

const DUET_MUX_POST = '/v1/duet-mux';
const DUET_MUX_JOB = '/v1/duet-mux/jobs';

export type DuetMuxJobStatusBody = {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  progress?: number;
  error?: string;
};

export type RequestDuetMuxOptions = {
  onProgress?: (progress: number | null) => void;
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
  if (signal?.aborted) throw makeAbortError();
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

async function pollDuetMuxJob(
  base: string,
  jobId: string,
  accessToken: string,
  signal: AbortSignal | undefined,
  onProgress?: (p: number | null) => void,
): Promise<string> {
  const deadline = Date.now() + 7 * 60_000;
  while (Date.now() < deadline) {
    assertNotAborted(signal);
    const r = await fetch(`${base}${DUET_MUX_JOB}/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(t || `Duet mux status failed (${r.status})`);
    }
    const j = (await r.json()) as DuetMuxJobStatusBody;
    if (j.status === 'failed') {
      throw new Error(j.error?.trim() || 'Duet mux failed');
    }
    if (j.status === 'completed' && j.outputUrl?.trim()) {
      return j.outputUrl.trim();
    }
    const p = typeof j.progress === 'number' && j.progress >= 0 && j.progress <= 1 ? j.progress : null;
    onProgress?.(p ?? (j.status === 'queued' ? 0.1 : 0.35));
    await sleep(1600, signal);
  }
  throw new Error('Duet mux timed out');
}

async function downloadToCache(outputUrl: string, fileName: string, onProgress?: (p: number | null) => void): Promise<string> {
  const dest = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
  const dr = FileSystem.createDownloadResumable(
    outputUrl,
    dest,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      if (totalBytesExpectedToWrite != null && totalBytesExpectedToWrite > 0) {
        const frac = totalBytesWritten / totalBytesExpectedToWrite;
        onProgress?.(0.92 + Math.min(1, frac) * 0.07);
      } else {
        onProgress?.(null);
      }
    },
  );
  const result = await dr.downloadAsync();
  if (!result?.uri) throw new Error('Download finished without a file');
  return result.uri;
}

/**
 * Calls export-worker duet mux (requires EXPO_PUBLIC_VIDEO_EXPORT_URL).
 * Returns a local file URI of the merged side-by-side MP4.
 */
export async function requestDuetMuxMergedFile(
  input: { leftVideoUrl: string; rightVideoUrl: string; clientRef?: string },
  opts: RequestDuetMuxOptions = {},
): Promise<string> {
  const { onProgress, signal } = opts;
  const base = videoExportBaseUrl();
  if (!base) throw new Error('Video export service is not configured');

  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) throw new Error('Not signed in');

  assertNotAborted(signal);
  onProgress?.(0.05);

  const res = await fetch(`${base}${DUET_MUX_POST}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      leftVideoUrl: input.leftVideoUrl.trim(),
      rightVideoUrl: input.rightVideoUrl.trim(),
      clientRef: input.clientRef?.trim(),
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Duet mux failed (${res.status})`);
  }

  const json = (await res.json()) as { jobId?: string; outputUrl?: string };

  let outputUrl: string | null = null;
  if (json.outputUrl?.trim()) {
    outputUrl = json.outputUrl.trim();
    onProgress?.(0.85);
  } else if (json.jobId?.trim()) {
    onProgress?.(0.12);
    outputUrl = await pollDuetMuxJob(base, json.jobId.trim(), session.access_token, signal, onProgress);
  }

  if (!outputUrl) throw new Error('Duet mux response missing outputUrl or jobId');

  assertNotAborted(signal);
  onProgress?.(0.92);

  const safeRef = (input.clientRef ?? 'duet').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 24) || 'duet';
  const outName = `pulseverse-duet-${safeRef}-${Date.now()}.mp4`;
  return downloadToCache(outputUrl, outName, onProgress);
}
