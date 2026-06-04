#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { createWriteStream } from 'node:fs';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * Poll worker for `public.creator_media_jobs` (service role).
 *
 * Requires migrations **184** (`claim_next_creator_media_job`) and **186**
 * (retry metadata, `awaiting_post_patch`, stale recovery).
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CREATOR_MEDIA_BUCKET           optional, default `post-media`
 *   CREATOR_MEDIA_MAX_CLIP_BYTES   optional, default 450mb per downloaded segment
 *   CREATOR_MEDIA_MAX_CLIP_DURATION_SEC   optional, default 600
 *   CREATOR_MEDIA_MAX_SUM_DURATION_SEC    optional, default 900 (concat sum cap)
 *   CREATOR_MEDIA_FFMPEG_TIMEOUT_MS       optional, default 20m per ffmpeg invoke
 *   CREATOR_MEDIA_FFPROBE_TIMEOUT_MS      optional, default 60s
 *   CREATOR_MEDIA_STALE_RUNNING_SECONDS   optional, default 2700 (recover_stale_* threshold)
 *   CREATOR_MEDIA_SKIP_STARTUP_RECOVERY   optional, set to `1` to skip stale sweep
 *
 * Requires **ffmpeg** + **ffprobe** on PATH for `stitch` and `broll`.
 *
 * ## Beta streaming downloads
 *
 * Inputs are downloaded via signed URL + streaming write (not a single Buffer).
 * `CREATOR_MEDIA_MAX_CLIP_BYTES` is enforced while streaming; oversize aborts with
 * `PERMANENT_OVERSIZED_INPUT`.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const watch = process.argv.includes('--watch');
const DEFAULT_BUCKET = process.env.CREATOR_MEDIA_BUCKET?.trim() || 'post-media';

const MAX_CLIP_BYTES = Math.max(
  8 * 1024 * 1024,
  Number(process.env.CREATOR_MEDIA_MAX_CLIP_BYTES || 450 * 1024 * 1024) || 450 * 1024 * 1024,
);
const MAX_CLIP_DURATION_SEC = Math.max(30, Number(process.env.CREATOR_MEDIA_MAX_CLIP_DURATION_SEC || 600) || 600);
const MAX_SUM_DURATION_SEC = Math.max(60, Number(process.env.CREATOR_MEDIA_MAX_SUM_DURATION_SEC || 900) || 900);
const FFMPEG_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.CREATOR_MEDIA_FFMPEG_TIMEOUT_MS || 20 * 60 * 1000) || 20 * 60 * 1000,
);
const FFPROBE_TIMEOUT_MS = Math.max(
  5000,
  Number(process.env.CREATOR_MEDIA_FFPROBE_TIMEOUT_MS || 60 * 1000) || 60 * 1000,
);
const STALE_RUNNING_SECONDS = Math.max(
  300,
  Number(process.env.CREATOR_MEDIA_STALE_RUNNING_SECONDS || 2700) || 2700,
);

/** B-roll Studio V1 (`video_composition`) product limits. Worker MAX_*_DURATION caps still apply as a hard fallback. */
const COMPOSITION_MAX_MAIN_SEC = Math.max(30, Number(process.env.CREATOR_MEDIA_COMP_MAX_MAIN_SEC || 180) || 180);
const COMPOSITION_MAX_LAYERS = Math.max(1, Number(process.env.CREATOR_MEDIA_COMP_MAX_LAYERS || 3) || 3);
const COMPOSITION_MAX_LAYER_SEC = Math.max(1, Number(process.env.CREATOR_MEDIA_COMP_MAX_LAYER_SEC || 30) || 30);
const COMPOSITION_MAX_TOTAL_OVERLAY_SEC = Math.max(
  1,
  Number(process.env.CREATOR_MEDIA_COMP_MAX_TOTAL_OVERLAY_SEC || 60) || 60,
);

/** PiP overlay size presets — fraction of the 1080px canvas width. */
const PIP_SIZE_FRACTION = { small: 0.25, medium: 0.35, large: 0.45 };
const PIP_POSITIONS = ['topRight', 'topLeft', 'bottomRight', 'bottomLeft', 'center'];
/** Edge margin (px) for floating overlays; bottom positions clear the caption zone. */
const PIP_MARGIN = 48;
const PIP_BOTTOM_SAFE = 220;

/** Even pixel width for a PiP size preset on a 1080px-wide canvas. */
function pipWidthForSize(size) {
  const frac = PIP_SIZE_FRACTION[size] ?? PIP_SIZE_FRACTION.medium;
  let w = Math.round(1080 * frac);
  if (w % 2 !== 0) w += 1;
  return w;
}

/** Cutout crop region presets (rectangle of the source frame to keep). */
const CROP_PRESETS = ['full', 'left', 'right', 'top', 'bottom', 'center'];

/**
 * ffmpeg crop filter chain (with trailing comma) for a cutout preset, using
 * source-relative expressions (iw/ih). Commas inside expressions are escaped.
 */
function cropFilterForPreset(preset) {
  switch (preset) {
    case 'left':
      return 'crop=iw/2:ih:0:0,';
    case 'right':
      return 'crop=iw/2:ih:iw/2:0,';
    case 'top':
      return 'crop=iw:ih/2:0:0,';
    case 'bottom':
      return 'crop=iw:ih/2:0:ih/2,';
    case 'center':
      return 'crop=min(iw\\,ih):min(iw\\,ih):(iw-min(iw\\,ih))/2:(ih-min(iw\\,ih))/2,';
    case 'full':
    default:
      return '';
  }
}

/** ffmpeg overlay x/y expressions for a position preset (W/H = main, w/h = overlay). */
function pipPositionExpr(position) {
  switch (position) {
    case 'topLeft':
      return { x: `${PIP_MARGIN}`, y: `${PIP_MARGIN}` };
    case 'bottomRight':
      return { x: `W-w-${PIP_MARGIN}`, y: `H-h-${PIP_BOTTOM_SAFE}` };
    case 'bottomLeft':
      return { x: `${PIP_MARGIN}`, y: `H-h-${PIP_BOTTOM_SAFE}` };
    case 'center':
      return { x: `(W-w)/2`, y: `(H-h)/2` };
    case 'topRight':
    default:
      return { x: `W-w-${PIP_MARGIN}`, y: `${PIP_MARGIN}` };
  }
}

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/** @param {string} userId */
function assertUserScopedStoragePath(userId, p) {
  if (typeof p !== 'string' || !p.trim()) throw new Error('PERMANENT_PAYLOAD: invalid storage path');
  const normalized = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\/+/, '');
  if (normalized.includes('..')) throw new Error('PERMANENT_PAYLOAD: path must not contain ..');
  const prefix = `${userId}/`;
  if (!normalized.startsWith(prefix)) throw new Error(`PERMANENT_PAYLOAD: path must start with ${prefix}`);
  return normalized;
}

/** FFmpeg concat demuxer line */
function concatFileLine(absLocalPath) {
  const posix = absLocalPath.replace(/\\/g, '/');
  const escaped = posix.replace(/'/g, `'\\''`);
  return `file '${escaped}'`;
}

function backoffMs(attemptCount) {
  const base = 900 + Math.min(120_000, 1000 * 2 ** Math.min(attemptCount, 8));
  const jitter = Math.floor(Math.random() * 400);
  return Math.min(15 * 60 * 1000, base + jitter);
}

/**
 * @param {unknown} err
 * @returns {{ code: string; transient: boolean }}
 */
function classifyFailure(err) {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === 'object' && 'code' in err ? String((/** @type {{ code?: unknown }} */ (err)).code) : '';

  if (code === 'ETIMEDOUT') return { code: 'FFMPEG_TIMEOUT', transient: true };

  if (msg.includes('PERMANENT_MISSING_MEDIA')) return { code: 'PERMANENT_MISSING_MEDIA', transient: false };
  if (msg.includes('PERMANENT_OVERSIZED_INPUT')) return { code: 'PERMANENT_OVERSIZED_INPUT', transient: false };
  if (msg.includes('PERMANENT_PAYLOAD')) return { code: 'PERMANENT_PAYLOAD', transient: false };
  if (msg.includes('PERMANENT_CORRUPT')) return { code: 'PERMANENT_CORRUPT', transient: false };
  if (msg.includes('PERMANENT_DURATION_CAP')) return { code: 'PERMANENT_DURATION_CAP', transient: false };

  if (msg.includes('TRANSIENT_DOWNLOAD')) return { code: 'TRANSIENT_DOWNLOAD', transient: true };
  if (msg.includes('TRANSIENT_DB')) return { code: 'TRANSIENT_DB', transient: true };

  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(msg)) return { code: 'TRANSIENT_NETWORK', transient: true };

  return { code: 'UNCLASSIFIED', transient: true };
}

async function ffmpegConcat(localFiles, outPath, tryCopyFirst) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-media-'));
  const listPath = path.join(tmpDir, 'concat.txt');
  const lines = localFiles.map((f) => concatFileLine(path.resolve(f)));
  await fs.writeFile(listPath, `${lines.join('\n')}\n`, 'utf8');

  const run = async (args) => {
    await execFileAsync('ffmpeg', args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: FFMPEG_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    });
  };

  try {
    if (tryCopyFirst) {
      try {
        await run([
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listPath,
          '-c',
          'copy',
          outPath,
        ]);
        return 'copy';
      } catch (e) {
        console.warn('[worker] ffmpeg -c copy failed, re-encoding:', e?.stderr || e?.message || e);
      }
    }
    await run([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outPath,
    ]);
    return 'reencode';
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Stream object from Storage to disk via signed URL (avoids whole-file Buffer).
 */
async function downloadToStreaming(supabaseClient, bucket, storagePath, destFsPath) {
  const { data: signed, error: signErr } = await supabaseClient.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`TRANSIENT_DOWNLOAD: sign failed ${signErr?.message || 'unknown'}`);
  }

  const res = await fetch(signed.signedUrl);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`PERMANENT_MISSING_MEDIA: ${storagePath}`);
    throw new Error(`TRANSIENT_DOWNLOAD: HTTP ${res.status} ${storagePath}`);
  }

  const cl = res.headers.get('content-length');
  if (cl && Number(cl) > MAX_CLIP_BYTES) {
    throw new Error(`PERMANENT_OVERSIZED_INPUT: Content-Length ${cl} for ${storagePath}`);
  }

  if (!res.body) throw new Error(`TRANSIENT_DOWNLOAD: empty body ${storagePath}`);

  await fs.mkdir(path.dirname(destFsPath), { recursive: true });

  let received = 0;
  const meter = new PassThrough();
  meter.on('data', (chunk) => {
    received += chunk.length;
    if (received > MAX_CLIP_BYTES) {
      meter.destroy(new Error(`PERMANENT_OVERSIZED_INPUT: exceeded ${MAX_CLIP_BYTES} bytes for ${storagePath}`));
    }
  });

  await pipeline(Readable.fromWeb(/** @type {import('stream/web').ReadableStream} */ (res.body)), meter, createWriteStream(destFsPath));
}

async function ffprobeDurationSeconds(localPath) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        localPath,
      ],
      { maxBuffer: 64 * 1024, timeout: FFPROBE_TIMEOUT_MS, killSignal: 'SIGKILL' },
    ));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
    if (code === 'ETIMEDOUT') throw new Error(`FFMPEG_TIMEOUT: ffprobe ${msg}`);
    throw new Error(`PERMANENT_CORRUPT: ffprobe failed ${msg}`);
  }
  const sec = parseFloat(String(stdout).trim());
  if (Number.isFinite(sec) && sec > 0) return sec;

  // Container has no duration in its metadata (common for browser-recorded/exported
  // WebM uploaded from the web composer). Fall back to a decode pass that reports the
  // real end timestamp.
  const measured = await ffmpegMeasuredDurationSeconds(localPath);
  if (Number.isFinite(measured) && measured > 0) return measured;

  throw new Error(`PERMANENT_CORRUPT: invalid duration for ${localPath}`);
}

/** Largest `time=HH:MM:SS.ms` token in ffmpeg progress/stderr output, in seconds. */
function parseFfmpegTimeSeconds(text) {
  let max = 0;
  const re = /time=\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    if (Number.isFinite(s) && s > max) max = s;
  }
  return max;
}

/**
 * Measure duration by decoding the file to a null muxer. Reliable when the container
 * lacks a duration (e.g. MediaRecorder WebM). Slower than ffprobe but only used as a fallback.
 */
async function ffmpegMeasuredDurationSeconds(localPath) {
  try {
    const { stderr } = await execFileAsync(
      'ffmpeg',
      ['-hide_banner', '-i', localPath, '-f', 'null', '-'],
      { maxBuffer: 16 * 1024 * 1024, timeout: FFMPEG_TIMEOUT_MS, killSignal: 'SIGKILL' },
    );
    return parseFfmpegTimeSeconds(stderr);
  } catch (e) {
    // ffmpeg may exit non-zero yet still have printed enough progress to derive duration.
    const stderr = e && typeof e === 'object' && 'stderr' in e ? String(e.stderr || '') : '';
    return parseFfmpegTimeSeconds(stderr);
  }
}

/** True if the file has at least one audio stream (ffprobe). Never throws for "no audio". */
async function ffprobeHasAudio(localPath) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=index',
        '-of',
        'csv=p=0',
        localPath,
      ],
      { maxBuffer: 64 * 1024, timeout: FFPROBE_TIMEOUT_MS, killSignal: 'SIGKILL' },
    );
    return String(stdout).trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ bucket: string, clipPaths: string[], outputPath: string }>}
 */
function normalizeStitchOrBroll(job) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const bucket = typeof input.bucket === 'string' && input.bucket.trim() ? input.bucket.trim() : DEFAULT_BUCKET;
  const uid = job.user_id;

  if (job.kind === 'stitch') {
    const clipPathsRaw = input.clipPaths;
    if (!Array.isArray(clipPathsRaw) || clipPathsRaw.length === 0) {
      throw new Error('PERMANENT_PAYLOAD: stitch requires input.clipPaths: non-empty string[]');
    }
    const clipPaths = clipPathsRaw.map((p, i) => {
      if (typeof p !== 'string') throw new Error(`PERMANENT_PAYLOAD: clipPaths[${i}] must be string`);
      return assertUserScopedStoragePath(uid, p);
    });
    let outputPath =
      typeof input.outputPath === 'string' && input.outputPath.trim()
        ? assertUserScopedStoragePath(uid, input.outputPath.trim())
        : `${uid}/exports/${job.id}.mp4`;
    return { bucket, clipPaths, outputPath };
  }

  if (job.kind === 'broll') {
    const mainPathRaw = input.mainPath;
    const cutawaysRaw = input.cutawayPaths;
    if (typeof mainPathRaw !== 'string') throw new Error('PERMANENT_PAYLOAD: broll requires input.mainPath: string');
    if (!Array.isArray(cutawaysRaw)) throw new Error('PERMANENT_PAYLOAD: broll requires input.cutawayPaths: string[]');
    const mainPath = assertUserScopedStoragePath(uid, mainPathRaw.trim());
    const cutaways = cutawaysRaw.map((p, i) => {
      if (typeof p !== 'string') throw new Error(`PERMANENT_PAYLOAD: cutawayPaths[${i}] must be string`);
      return assertUserScopedStoragePath(uid, p.trim());
    });
    const clipPaths = [mainPath, ...cutaways];
    let outputPath =
      typeof input.outputPath === 'string' && input.outputPath.trim()
        ? assertUserScopedStoragePath(uid, input.outputPath.trim())
        : `${uid}/exports/broll-${job.id}.mp4`;
    return { bucket, clipPaths, outputPath };
  }

  throw new Error(`PERMANENT_PAYLOAD: unsupported kind: ${job.kind}`);
}

function normalizeTrim(job) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const uid = job.user_id;
  const clipId = typeof input.target_live_clip_id === 'string' ? input.target_live_clip_id.trim() : '';
  const postId = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!clipId && !postId) {
    throw new Error('PERMANENT_PAYLOAD: trim requires target_live_clip_id or target_post_id');
  }
  const bucketIn =
    typeof input.bucket === 'string' && input.bucket.trim()
      ? input.bucket.trim()
      : postId
        ? DEFAULT_BUCKET
        : 'live-recordings';
  const storagePathIn = input.storagePathIn;
  if (typeof storagePathIn !== 'string' || !storagePathIn.trim()) {
    throw new Error('PERMANENT_PAYLOAD: trim requires input.storagePathIn: string');
  }
  const trimStartSec = Number(input.trimStartSec);
  const trimEndSec = Number(input.trimEndSec);
  if (!Number.isFinite(trimStartSec) || !Number.isFinite(trimEndSec) || trimEndSec <= trimStartSec) {
    throw new Error('PERMANENT_PAYLOAD: trim requires valid trimStartSec/trimEndSec');
  }

  const outputBucket =
    typeof input.outputBucket === 'string' && input.outputBucket.trim()
      ? input.outputBucket.trim()
      : DEFAULT_BUCKET;
  const defaultOutputPath = postId
    ? assertUserScopedStoragePath(uid, `feed-clips/${postId}.mp4`)
    : assertUserScopedStoragePath(uid, `live-clips/${job.id}.mp4`);
  const outputPath =
    typeof input.outputPath === 'string' && input.outputPath.trim()
      ? assertUserScopedStoragePath(uid, input.outputPath.trim())
      : defaultOutputPath;
  const thumbPath = outputPath.replace(/\.mp4$/i, '.jpg');

  return {
    bucketIn,
    storagePathIn: storagePathIn.trim(),
    trimStartSec,
    trimEndSec,
    outputBucket,
    outputPath,
    thumbPath,
    clipId,
    postId,
  };
}

async function ffmpegTrimSegment(localIn, localOut, trimStartSec, trimEndSec) {
  await execFileAsync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String(trimStartSec),
      '-to',
      String(trimEndSec),
      '-i',
      localIn,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      localOut,
    ],
    { maxBuffer: 20 * 1024 * 1024, timeout: FFMPEG_TIMEOUT_MS, killSignal: 'SIGKILL' },
  );
}

async function ffmpegExtractThumbnail(localVideo, localThumb) {
  await execFileAsync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      '1',
      '-i',
      localVideo,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      localThumb,
    ],
    { maxBuffer: 8 * 1024 * 1024, timeout: FFPROBE_TIMEOUT_MS, killSignal: 'SIGKILL' },
  );
}

async function processTrimEncode(job) {
  const { bucketIn, storagePathIn, trimStartSec, trimEndSec, outputBucket, outputPath, thumbPath } =
    normalizeTrim(job);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-trim-'));
  try {
    const ext = path.extname(storagePathIn) || '.mp4';
    const localIn = path.join(workDir, `src${ext}`);
    await downloadToStreaming(supabase, bucketIn, storagePathIn, localIn);

    const clipDur = trimEndSec - trimStartSec;
    if (clipDur > MAX_CLIP_DURATION_SEC) {
      throw new Error(
        `PERMANENT_DURATION_CAP: trim window ${clipDur}s exceeds CREATOR_MEDIA_MAX_CLIP_DURATION_SEC (${MAX_CLIP_DURATION_SEC})`,
      );
    }

    const outLocal = path.join(workDir, `out_${job.id}.mp4`);
    await ffmpegTrimSegment(localIn, outLocal, trimStartSec, trimEndSec);
    const dur = await ffprobeDurationSeconds(outLocal);

    const thumbLocal = path.join(workDir, `thumb_${job.id}.jpg`);
    await ffmpegExtractThumbnail(outLocal, thumbLocal).catch(() => {});

    const outBody = await fs.readFile(outLocal);
    const { error: upErr } = await supabase.storage.from(outputBucket).upload(outputPath, outBody, {
      contentType: 'video/mp4',
      upsert: true,
    });
    if (upErr) throw new Error(`TRANSIENT_DOWNLOAD: upload failed ${upErr.message}`);

    let thumbUploaded = false;
    try {
      const thumbBody = await fs.readFile(thumbLocal);
      const { error: thErr } = await supabase.storage.from(outputBucket).upload(thumbPath, thumbBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      thumbUploaded = !thErr;
    } catch {
      thumbUploaded = false;
    }

    const outStat = await fs.stat(outLocal);
    return {
      bucket: outputBucket,
      storagePath: outputPath,
      thumbnailPath: thumbUploaded ? thumbPath : null,
      bytes: outStat.size,
      durationSeconds: Math.round(dur),
      sourceBucket: bucketIn,
      sourcePath: storagePathIn,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function patchTargetPostAfterTrim(job, output) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || job.kind !== 'trim') return true;

  const { data: postRow, error: selErr } = await supabase
    .from('posts')
    .select('id, creator_id')
    .eq('id', tid)
    .maybeSingle();
  if (selErr || !postRow || postRow.creator_id !== job.user_id) {
    console.error('[worker] feed clip target_post_id invalid or ownership mismatch', tid, selErr?.message);
    return false;
  }

  const bucket = output.bucket;
  const storagePath = output.storagePath;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const mediaUrl = pub?.publicUrl?.trim();
  if (!mediaUrl) {
    console.error('[worker] getPublicUrl returned empty for trim output');
    return false;
  }

  const update = {
    media_url: mediaUrl,
    media_processing_status: null,
    media_processing_job_id: null,
    media_processing_error: null,
  };
  if (output.thumbnailPath) {
    const { data: thPub } = supabase.storage.from(bucket).getPublicUrl(output.thumbnailPath);
    if (thPub?.publicUrl?.trim()) update.thumbnail_url = thPub.publicUrl.trim();
  }

  const { error: upErr } = await supabase
    .from('posts')
    .update(update)
    .eq('id', tid)
    .eq('creator_id', job.user_id);
  if (upErr) {
    console.error('[worker] posts patch after feed trim failed', upErr.message);
    return false;
  }
  return true;
}

async function patchLiveClipAfterTrim(job, output) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const clipId = typeof input.target_live_clip_id === 'string' ? input.target_live_clip_id.trim() : '';
  if (!clipId) return false;

  const { error } = await supabase
    .from('live_clips')
    .update({
      status: 'ready',
      storage_path: output.storagePath,
      thumbnail_path: output.thumbnailPath,
      duration_seconds: output.durationSeconds,
      error_message: null,
    })
    .eq('id', clipId)
    .eq('host_id', job.user_id);
  if (error) {
    console.error('[worker] live_clips patch after trim failed', error.message);
    return false;
  }
  return true;
}

async function patchLiveClipOnFailure(job, errorMsg) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const clipId = typeof input.target_live_clip_id === 'string' ? input.target_live_clip_id.trim() : '';
  if (!clipId || job.kind !== 'trim') return;

  const safe = errorMsg.length > 500 ? `${errorMsg.slice(0, 497)}…` : errorMsg;
  const { error } = await supabase
    .from('live_clips')
    .update({ status: 'failed', error_message: safe })
    .eq('id', clipId)
    .eq('host_id', job.user_id);
  if (error) console.error('[worker] live_clips failure patch', error.message);
}

async function runTrimPass(job) {
  const output = await processTrimEncode(job);
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const postId = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (postId) {
    const patched = await patchTargetPostAfterTrim(job, output);
    if (!patched) throw new Error('TRANSIENT_DB: posts patch failed after feed trim');
  } else {
    const patched = await patchLiveClipAfterTrim(job, output);
    if (!patched) throw new Error('TRANSIENT_DB: live_clips patch failed after trim');
  }
  await markSucceeded(job, output);
  console.log('[worker] trim succeeded', job.id, output.storagePath);
}

async function processStitchOrBrollEncode(job) {
  const { bucket, clipPaths, outputPath } = normalizeStitchOrBroll(job);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-job-'));
  const locals = [];
  let sumDur = 0;
  try {
    for (let i = 0; i < clipPaths.length; i += 1) {
      const sp = clipPaths[i];
      const ext = path.extname(sp) || '.mp4';
      const local = path.join(workDir, `seg_${i}${ext}`);
      await downloadToStreaming(supabase, bucket, sp, local);
      const dur = await ffprobeDurationSeconds(local);
      if (dur > MAX_CLIP_DURATION_SEC) {
        throw new Error(
          `PERMANENT_DURATION_CAP: clip ${i} duration ${dur}s exceeds CREATOR_MEDIA_MAX_CLIP_DURATION_SEC (${MAX_CLIP_DURATION_SEC})`,
        );
      }
      sumDur += dur;
      if (sumDur > MAX_SUM_DURATION_SEC) {
        throw new Error(
          `PERMANENT_DURATION_CAP: combined duration ${sumDur}s exceeds CREATOR_MEDIA_MAX_SUM_DURATION_SEC (${MAX_SUM_DURATION_SEC})`,
        );
      }
      locals.push(local);
    }

    const outLocal = path.join(workDir, `out_${job.id}.mp4`);
    const ffmpegMode = await ffmpegConcat(locals, outLocal, true);

    const outStat = await fs.stat(outLocal);
    const body = await fs.readFile(outLocal);

    const { error: upErr } = await supabase.storage.from(bucket).upload(outputPath, body, {
      contentType: 'video/mp4',
      upsert: true,
    });
    if (upErr) throw new Error(`TRANSIENT_DOWNLOAD: upload failed ${upErr.message}`);

    return {
      bucket,
      storagePath: outputPath,
      bytes: outStat.size,
      ffmpegMode,
      clipCount: clipPaths.length,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Normalize a `video_composition` job (B-roll Studio cutaway mode).
 * Validates ownership of every storage path and enforces V1 product limits.
 * @returns {{ bucket: string, fps: number, mainPath: string, mainVolume: number, layers: Array<object>, outputPath: string }}
 */
function normalizeComposition(job) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const uid = job.user_id;
  const bucket = typeof input.bucket === 'string' && input.bucket.trim() ? input.bucket.trim() : DEFAULT_BUCKET;

  const canvas = input.canvas && typeof input.canvas === 'object' ? input.canvas : {};
  const fps = Number.isFinite(Number(canvas.fps)) && Number(canvas.fps) > 0 ? Math.min(60, Number(canvas.fps)) : 30;

  const main = input.main && typeof input.main === 'object' ? input.main : null;
  if (!main || typeof main.path !== 'string' || !main.path.trim()) {
    throw new Error('PERMANENT_PAYLOAD: video_composition requires input.main.path: string');
  }
  const mainPath = assertUserScopedStoragePath(uid, main.path.trim());
  const mainVolume = Number.isFinite(Number(main.audioVolume)) ? Number(main.audioVolume) : 1.0;

  const layersRaw = input.layers;
  if (!Array.isArray(layersRaw) || layersRaw.length === 0) {
    throw new Error('PERMANENT_PAYLOAD: video_composition requires input.layers: non-empty array');
  }
  if (layersRaw.length > COMPOSITION_MAX_LAYERS) {
    throw new Error(`PERMANENT_PAYLOAD: too many cutaways (max ${COMPOSITION_MAX_LAYERS})`);
  }

  let totalOverlay = 0;
  const layers = layersRaw.map((l, i) => {
    if (!l || typeof l !== 'object') throw new Error(`PERMANENT_PAYLOAD: layers[${i}] must be object`);
    // 'cutaway' = full-screen replace. 'pip'/'overlay' = floating overlay (Phase 2).
    // 'cutout' = cropped-region floating overlay (Phase 4).
    const rawType = l.type;
    const kind =
      rawType === 'pip' || rawType === 'overlay'
        ? 'pip'
        : rawType === 'cutout'
          ? 'cutout'
          : rawType === 'cutaway'
            ? 'cutaway'
            : null;
    if (!kind) throw new Error(`PERMANENT_PAYLOAD: layers[${i}].type must be "cutaway", "pip", or "cutout"`);
    if (typeof l.path !== 'string' || !l.path.trim()) throw new Error(`PERMANENT_PAYLOAD: layers[${i}].path must be string`);
    const path0 = assertUserScopedStoragePath(uid, l.path.trim());
    const trimStart = Number(l.trimStart);
    const trimEnd = Number(l.trimEnd);
    const timelineStart = Number(l.timelineStart);
    const timelineEnd = Number(l.timelineEnd);
    if (![trimStart, trimEnd, timelineStart, timelineEnd].every(Number.isFinite)) {
      throw new Error(`PERMANENT_PAYLOAD: layers[${i}] needs numeric trim/timeline`);
    }
    if (trimEnd <= trimStart || timelineEnd <= timelineStart) {
      throw new Error(`PERMANENT_PAYLOAD: layers[${i}] invalid trim/timeline range`);
    }
    if (trimEnd - trimStart > COMPOSITION_MAX_LAYER_SEC) {
      throw new Error(`PERMANENT_DURATION_CAP: layer ${i} exceeds ${COMPOSITION_MAX_LAYER_SEC}s`);
    }
    const audioMode = ['muted', 'both', 'broll_only'].includes(l.audioMode) ? l.audioMode : 'muted';
    let position = 'topRight';
    let size = 'medium';
    let cropPreset = 'full';
    if (kind === 'pip' || kind === 'cutout') {
      position = PIP_POSITIONS.includes(l.position) ? l.position : 'topRight';
      size = PIP_SIZE_FRACTION[l.size] != null ? l.size : 'medium';
    }
    if (kind === 'cutout') {
      const crop = l.crop && typeof l.crop === 'object' ? l.crop : {};
      cropPreset = CROP_PRESETS.includes(crop.preset) ? crop.preset : 'center';
    }
    totalOverlay += timelineEnd - timelineStart;
    return { kind, path: path0, trimStart, trimEnd, timelineStart, timelineEnd, audioMode, position, size, cropPreset };
  });

  if (totalOverlay > COMPOSITION_MAX_TOTAL_OVERLAY_SEC) {
    throw new Error(`PERMANENT_DURATION_CAP: total cutaway overlay exceeds ${COMPOSITION_MAX_TOTAL_OVERLAY_SEC}s`);
  }

  const outputPath =
    typeof input.outputPath === 'string' && input.outputPath.trim()
      ? assertUserScopedStoragePath(uid, input.outputPath.trim())
      : `${uid}/exports/comp-${job.id}.mp4`;

  return { bucket, fps, mainPath, mainVolume, layers, outputPath };
}

/**
 * Build the ffmpeg `-filter_complex` for cutaway composition.
 * Inputs: 0 = main, 1..N = layer files, then an optional silent anullsrc input.
 * @returns {{ filter: string, mapVideo: string, mapAudio: string | null }}
 */
function buildCompositionFilter(spec) {
  const { fps, layers, hasMainAudio, layerHasAudio, silentInputIndex } = spec;
  const W = 1080;
  const H = 1920;
  const vParts = [];

  vParts.push(`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps}[base0]`);
  layers.forEach((l, i) => {
    const inIdx = i + 1;
    const effEnd = Math.min(l.timelineEnd, l.timelineStart + (l.trimEnd - l.trimStart));
    if (l.kind === 'pip' || l.kind === 'cutout') {
      // Floating overlay: (cutout) crop a region first, then scale to a size preset
      // (aspect preserved) and place at a position preset.
      const pipW = pipWidthForSize(l.size);
      const { x, y } = pipPositionExpr(l.position);
      const cropChain = l.kind === 'cutout' ? cropFilterForPreset(l.cropPreset) : '';
      vParts.push(
        `[${inIdx}:v]${cropChain}scale=${pipW}:-2,setsar=1,fps=${fps},` +
          `trim=start=${l.trimStart}:end=${l.trimEnd},setpts=PTS-STARTPTS+${l.timelineStart}/TB[l${i}]`,
      );
      vParts.push(`[base${i}][l${i}]overlay=${x}:${y}:enable='between(t,${l.timelineStart},${effEnd})'[base${i + 1}]`);
    } else {
      // Cutaway: cover the full canvas during the window (V1 behavior).
      vParts.push(
        `[${inIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps},` +
          `trim=start=${l.trimStart}:end=${l.trimEnd},setpts=PTS-STARTPTS+${l.timelineStart}/TB[l${i}]`,
      );
      vParts.push(`[base${i}][l${i}]overlay=0:0:enable='between(t,${l.timelineStart},${effEnd})'[base${i + 1}]`);
    }
  });
  vParts.push(`[base${layers.length}]format=yuv420p[vout]`);

  // Audio: main is the base across the whole timeline; broll_only mutes main during
  // its window; both/broll_only mix the (delayed, trimmed) layer audio during its window.
  const audioContribIndexes = layers
    .map((l, i) => ({ l, i }))
    .filter((x) => (x.l.audioMode === 'both' || x.l.audioMode === 'broll_only') && layerHasAudio[x.i]);
  const brollOnly = layers.filter((l) => l.audioMode === 'broll_only');

  const needAudio = hasMainAudio || audioContribIndexes.length > 0;
  if (!needAudio) {
    return { filter: vParts.join(';'), mapVideo: '[vout]', mapAudio: null };
  }

  const bothLayers = layers.filter((l) => l.audioMode === 'both');

  const aParts = [];
  let baseLabel;
  if (hasMainAudio) {
    let chain = `[0:a]aresample=async=1`;
    // broll_only: fully duck main during the segment.
    brollOnly.forEach((l) => {
      const effEnd = Math.min(l.timelineEnd, l.timelineStart + (l.trimEnd - l.trimStart));
      chain += `,volume=volume=0:enable='between(t,${l.timelineStart},${effEnd})'`;
    });
    // both: gentle gain reduction on main during the segment to leave headroom for the mix.
    bothLayers.forEach((l) => {
      const effEnd = Math.min(l.timelineEnd, l.timelineStart + (l.trimEnd - l.trimStart));
      chain += `,volume=volume=0.8:enable='between(t,${l.timelineStart},${effEnd})'`;
    });
    chain += '[am]';
    aParts.push(chain);
    baseLabel = '[am]';
  } else {
    baseLabel = `[${silentInputIndex}:a]`;
  }

  const mixLabels = [baseLabel];
  audioContribIndexes.forEach(({ l, i }) => {
    const delayMs = Math.round(l.timelineStart * 1000);
    // both: reduce the overlay's contribution to avoid clipping when summed with main.
    const layerVol = l.audioMode === 'both' ? 0.8 : 1.0;
    aParts.push(
      `[${i + 1}:a]atrim=start=${l.trimStart}:end=${l.trimEnd},asetpts=PTS-STARTPTS,` +
        `volume=${layerVol},adelay=${delayMs}|${delayMs}[al${i}]`,
    );
    mixLabels.push(`[al${i}]`);
  });

  let mapAudio;
  if (mixLabels.length === 1) {
    // Single source — relabel to [aout] for a clean -map.
    aParts.push(`${baseLabel}anull[aout]`);
    mapAudio = '[aout]';
  } else {
    aParts.push(
      `${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0[aout]`,
    );
    mapAudio = '[aout]';
  }

  return { filter: [...vParts, ...aParts].join(';'), mapVideo: '[vout]', mapAudio };
}

async function processCompositionEncode(job) {
  const { bucket, fps, mainPath, layers, outputPath } = normalizeComposition(job);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-comp-'));
  try {
    // Download main (input 0)
    const mainExt = path.extname(mainPath) || '.mp4';
    const mainLocal = path.join(workDir, `main${mainExt}`);
    await downloadToStreaming(supabase, bucket, mainPath, mainLocal);
    const mainDur = await ffprobeDurationSeconds(mainLocal);
    if (mainDur > COMPOSITION_MAX_MAIN_SEC) {
      throw new Error(`PERMANENT_DURATION_CAP: main video ${Math.round(mainDur)}s exceeds ${COMPOSITION_MAX_MAIN_SEC}s`);
    }
    if (mainDur > MAX_CLIP_DURATION_SEC) {
      throw new Error(`PERMANENT_DURATION_CAP: main video exceeds hard cap ${MAX_CLIP_DURATION_SEC}s`);
    }
    const hasMainAudio = await ffprobeHasAudio(mainLocal);

    // Download each layer (inputs 1..N), validate against main timeline + caps.
    const layerLocals = [];
    const layerHasAudio = [];
    for (let i = 0; i < layers.length; i += 1) {
      const l = layers[i];
      const ext = path.extname(l.path) || '.mp4';
      const local = path.join(workDir, `layer_${i}${ext}`);
      await downloadToStreaming(supabase, bucket, l.path, local);
      const dur = await ffprobeDurationSeconds(local);
      if (l.trimEnd > dur + 0.25) {
        throw new Error(`PERMANENT_PAYLOAD: cutaway ${i} trimEnd ${l.trimEnd}s exceeds clip length ${dur.toFixed(2)}s`);
      }
      if (l.timelineEnd > mainDur + 0.25) {
        throw new Error(`PERMANENT_PAYLOAD: cutaway ${i} timelineEnd ${l.timelineEnd}s exceeds main length ${mainDur.toFixed(2)}s`);
      }
      layerLocals.push(local);
      layerHasAudio.push(await ffprobeHasAudio(local));
    }

    const audioContribCount = layers.filter(
      (l, i) => (l.audioMode === 'both' || l.audioMode === 'broll_only') && layerHasAudio[i],
    ).length;
    const needSilentBase = !hasMainAudio && audioContribCount > 0;

    const inputArgs = ['-i', mainLocal];
    layerLocals.forEach((lp) => inputArgs.push('-i', lp));
    let silentInputIndex = -1;
    if (needSilentBase) {
      silentInputIndex = 1 + layerLocals.length;
      inputArgs.push(
        '-f',
        'lavfi',
        '-t',
        String(Math.ceil(mainDur) + 1),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
      );
    }

    const { filter, mapVideo, mapAudio } = buildCompositionFilter({
      fps,
      layers,
      hasMainAudio,
      layerHasAudio,
      silentInputIndex,
    });

    const outLocal = path.join(workDir, `out_${job.id}.mp4`);
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...inputArgs,
      '-filter_complex',
      filter,
      '-map',
      mapVideo,
    ];
    if (mapAudio) args.push('-map', mapAudio);
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(fps),
      // End the output when the (main) video ends; audio mixes can run long otherwise.
      '-t',
      String(mainDur),
    );
    if (mapAudio) {
      args.push('-c:a', 'aac', '-b:a', '128k');
    } else {
      args.push('-an');
    }
    args.push('-movflags', '+faststart', outLocal);

    await execFileAsync('ffmpeg', args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: FFMPEG_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    });

    const outStat = await fs.stat(outLocal);
    const body = await fs.readFile(outLocal);
    const { error: upErr } = await supabase.storage.from(bucket).upload(outputPath, body, {
      contentType: 'video/mp4',
      upsert: true,
    });
    if (upErr) throw new Error(`TRANSIENT_DOWNLOAD: upload failed ${upErr.message}`);

    return {
      bucket,
      storagePath: outputPath,
      bytes: outStat.size,
      ffmpegMode: 'composition',
      layerCount: layers.length,
      // QA observability: per-layer mode + crop/position/size + trim/timeline + audio.
      layerSummary: layers
        .map((l) => {
          const head =
            l.kind === 'pip'
              ? `pip:${l.position}/${l.size}`
              : l.kind === 'cutout'
                ? `cutout:${l.cropPreset}/${l.position}/${l.size}`
                : 'cutaway';
          return (
            `${head} t[${l.trimStart}-${l.trimEnd}] tl[${l.timelineStart}-${l.timelineEnd}] a:${l.audioMode}`
          );
        })
        .join(' | '),
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function clampNum(v, lo, hi, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Normalize a Green Screen (`video_composition` with `input.greenScreen`) job.
 * Validates ownership of every storage path and enforces V1 product limits.
 */
function normalizeGreenScreen(job) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const uid = job.user_id;
  const bucket = typeof input.bucket === 'string' && input.bucket.trim() ? input.bucket.trim() : DEFAULT_BUCKET;
  const canvas = input.canvas && typeof input.canvas === 'object' ? input.canvas : {};
  const fps = Number.isFinite(Number(canvas.fps)) && Number(canvas.fps) > 0 ? Math.min(60, Number(canvas.fps)) : 30;

  const gs = input.greenScreen && typeof input.greenScreen === 'object' ? input.greenScreen : null;
  if (!gs) throw new Error('PERMANENT_PAYLOAD: greenScreen object required');
  if (typeof gs.foregroundPath !== 'string' || !gs.foregroundPath.trim()) {
    throw new Error('PERMANENT_PAYLOAD: greenScreen.foregroundPath required');
  }
  if (typeof gs.backgroundPath !== 'string' || !gs.backgroundPath.trim()) {
    throw new Error('PERMANENT_PAYLOAD: greenScreen.backgroundPath required');
  }
  const backgroundType = gs.backgroundType === 'image' ? 'image' : gs.backgroundType === 'video' ? 'video' : null;
  if (!backgroundType) throw new Error('PERMANENT_UNSUPPORTED_BG: backgroundType must be image or video');

  const foregroundPath = assertUserScopedStoragePath(uid, gs.foregroundPath.trim());
  const backgroundPath = assertUserScopedStoragePath(uid, gs.backgroundPath.trim());

  let keyColor = '0x00ff00';
  if (typeof gs.keyColor === 'string' && /^0x[0-9a-fA-F]{6}$/.test(gs.keyColor.trim())) {
    keyColor = gs.keyColor.trim().toLowerCase();
  }

  const strength = clampNum(gs.strength, 0.05, 0.9, 0.35);
  const edgeSoftness = clampNum(gs.edgeSoftness, 0, 0.5, 0.08);
  const audioMode = ['foreground', 'background', 'both'].includes(gs.audioMode) ? gs.audioMode : 'foreground';
  const foregroundVolume = clampNum(gs.foregroundVolume, 0, 2, audioMode === 'background' ? 0 : 1);
  const backgroundVolume = clampNum(
    gs.backgroundVolume,
    0,
    2,
    audioMode === 'foreground' ? 0 : audioMode === 'both' ? 0.45 : 1,
  );

  const outputPath =
    typeof input.outputPath === 'string' && input.outputPath.trim()
      ? assertUserScopedStoragePath(uid, input.outputPath.trim())
      : `${uid}/exports/comp-${job.id}.mp4`;

  return {
    bucket,
    fps,
    foregroundPath,
    backgroundPath,
    backgroundType,
    keyColor,
    strength,
    edgeSoftness,
    audioMode,
    foregroundVolume,
    backgroundVolume,
    outputPath,
  };
}

async function processGreenScreenEncode(job) {
  const spec = normalizeGreenScreen(job);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-gs-'));
  try {
    const W = 1080;
    const H = 1920;

    // Foreground (input 0)
    const fgExt = path.extname(spec.foregroundPath) || '.mp4';
    const fgLocal = path.join(workDir, `fg${fgExt}`);
    await downloadToStreaming(supabase, spec.bucket, spec.foregroundPath, fgLocal);
    let fgDur;
    try {
      fgDur = await ffprobeDurationSeconds(fgLocal);
    } catch (e) {
      throw new Error(`PERMANENT_CORRUPT: foreground unreadable ${e instanceof Error ? e.message : e}`);
    }
    if (fgDur > COMPOSITION_MAX_MAIN_SEC) {
      throw new Error(`PERMANENT_DURATION_CAP: foreground ${Math.round(fgDur)}s exceeds ${COMPOSITION_MAX_MAIN_SEC}s`);
    }
    if (fgDur > MAX_CLIP_DURATION_SEC) {
      throw new Error(`PERMANENT_DURATION_CAP: foreground exceeds hard cap ${MAX_CLIP_DURATION_SEC}s`);
    }
    const hasFgAudio = await ffprobeHasAudio(fgLocal);

    // Background (input 1)
    const bgExt = path.extname(spec.backgroundPath) || (spec.backgroundType === 'image' ? '.jpg' : '.mp4');
    const bgLocal = path.join(workDir, `bg${bgExt}`);
    await downloadToStreaming(supabase, spec.bucket, spec.backgroundPath, bgLocal);
    let hasBgAudio = false;
    if (spec.backgroundType === 'video') {
      let bgDur;
      try {
        bgDur = await ffprobeDurationSeconds(bgLocal);
      } catch (e) {
        throw new Error(`PERMANENT_UNSUPPORTED_BG: background unreadable ${e instanceof Error ? e.message : e}`);
      }
      if (bgDur > COMPOSITION_MAX_MAIN_SEC) {
        throw new Error(`PERMANENT_DURATION_CAP: background ${Math.round(bgDur)}s exceeds ${COMPOSITION_MAX_MAIN_SEC}s`);
      }
      hasBgAudio = await ffprobeHasAudio(bgLocal);
    }

    // Inputs: fg = 0, bg = 1 (image held via -loop 1, video looped via -stream_loop -1; -t bounds output).
    const inputArgs = ['-i', fgLocal];
    if (spec.backgroundType === 'image') {
      inputArgs.push('-loop', '1', '-i', bgLocal);
    } else {
      inputArgs.push('-stream_loop', '-1', '-i', bgLocal);
    }

    const sim = spec.strength.toFixed(3);
    const blend = spec.edgeSoftness.toFixed(3);
    const vParts = [
      `[1:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${spec.fps}[bg]`,
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${spec.fps},` +
        `chromakey=${spec.keyColor}:${sim}:${blend}[fg]`,
      `[bg][fg]overlay=0:0[ov]`,
      `[ov]format=yuv420p[vout]`,
    ];

    const aParts = [];
    let mapAudio = null;
    if (spec.audioMode === 'foreground') {
      if (hasFgAudio) {
        aParts.push(`[0:a]aresample=async=1,volume=${spec.foregroundVolume}[aout]`);
        mapAudio = '[aout]';
      }
    } else if (spec.audioMode === 'background') {
      if (hasBgAudio) {
        aParts.push(`[1:a]aresample=async=1,volume=${spec.backgroundVolume}[aout]`);
        mapAudio = '[aout]';
      }
    } else {
      // both — mix with safe gain reduction; fall back to whichever single track exists.
      if (hasFgAudio && hasBgAudio) {
        aParts.push(`[0:a]aresample=async=1,volume=${spec.foregroundVolume}[a0]`);
        aParts.push(`[1:a]aresample=async=1,volume=${spec.backgroundVolume}[a1]`);
        aParts.push(`[a0][a1]amix=inputs=2:normalize=0:dropout_transition=0[aout]`);
        mapAudio = '[aout]';
      } else if (hasFgAudio) {
        aParts.push(`[0:a]aresample=async=1,volume=${spec.foregroundVolume}[aout]`);
        mapAudio = '[aout]';
      } else if (hasBgAudio) {
        aParts.push(`[1:a]aresample=async=1,volume=${spec.backgroundVolume}[aout]`);
        mapAudio = '[aout]';
      }
    }

    const filter = [...vParts, ...aParts].join(';');
    const outLocal = path.join(workDir, `out_${job.id}.mp4`);
    const args = ['-hide_banner', '-loglevel', 'error', '-y', ...inputArgs, '-filter_complex', filter, '-map', '[vout]'];
    if (mapAudio) args.push('-map', mapAudio);
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', String(spec.fps), '-t', String(fgDur));
    if (mapAudio) {
      args.push('-c:a', 'aac', '-b:a', '128k');
    } else {
      args.push('-an');
    }
    args.push('-movflags', '+faststart', outLocal);

    await execFileAsync('ffmpeg', args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: FFMPEG_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    });

    const outStat = await fs.stat(outLocal);
    const body = await fs.readFile(outLocal);
    const { error: upErr } = await supabase.storage.from(spec.bucket).upload(spec.outputPath, body, {
      contentType: 'video/mp4',
      upsert: true,
    });
    if (upErr) throw new Error(`TRANSIENT_DOWNLOAD: upload failed ${upErr.message}`);

    return {
      bucket: spec.bucket,
      storagePath: spec.outputPath,
      bytes: outStat.size,
      ffmpegMode: 'green_screen',
      layerSummary: `green_screen:${spec.backgroundType}/${spec.keyColor}/${spec.audioMode}`,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Job kinds that render into a feed post and patch posts.media_url on completion. */
function isPostMediaKind(kind) {
  return kind === 'stitch' || kind === 'broll' || kind === 'video_composition';
}

async function setPostMediaProcessingStatus(job, status) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || !isPostMediaKind(job.kind)) return;

  const { error } = await supabase
    .from('posts')
    .update({ media_processing_status: status })
    .eq('id', tid)
    .eq('creator_id', job.user_id);
  if (error) console.error('[worker] posts media_processing_status patch failed', error.message);
}

/**
 * When input.target_post_id is set, patch posts.media_url after successful concat.
 * @returns {Promise<boolean>} false if post was not updated (investigate / retry manually).
 */
async function patchTargetPostAfterStitch(job, output) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || !isPostMediaKind(job.kind)) return true;

  const { data: postRow, error: selErr } = await supabase
    .from('posts')
    .select('id, creator_id')
    .eq('id', tid)
    .maybeSingle();
  if (selErr || !postRow || postRow.creator_id !== job.user_id) {
    console.error('[worker] target_post_id invalid or ownership mismatch', tid, selErr?.message);
    return false;
  }

  const bucket = output.bucket;
  const storagePath = output.storagePath;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const mediaUrl = pub?.publicUrl?.trim();
  if (!mediaUrl) {
    console.error('[worker] getPublicUrl returned empty for stitched output');
    return false;
  }

  const { error: upErr } = await supabase
    .from('posts')
    .update({
      media_url: mediaUrl,
      media_processing_status: null,
      media_processing_job_id: null,
      media_processing_error: null,
    })
    .eq('id', tid)
    .eq('creator_id', job.user_id);
  if (upErr) {
    console.error('[worker] posts patch after stitch failed', upErr.message);
    return false;
  }
  return true;
}

async function patchTargetPostOnFailure(job, errorMsg) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid) return;
  const isTargetKind = isPostMediaKind(job.kind) || (job.kind === 'trim' && tid);
  if (!isTargetKind) return;

  const safe = errorMsg.length > 500 ? `${errorMsg.slice(0, 497)}…` : errorMsg;
  const { error } = await supabase
    .from('posts')
    .update({
      media_processing_status: 'failed',
      media_processing_error: safe,
    })
    .eq('id', tid)
    .eq('creator_id', job.user_id);
  if (error) console.error('[worker] posts patch on job failure', error.message);
}

function normalizeClaimedJob(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function terminalTs() {
  return new Date().toISOString();
}

async function recoverStaleRunningOnce() {
  if (process.env.CREATOR_MEDIA_SKIP_STARTUP_RECOVERY === '1') return;
  const { data, error } = await supabase.rpc('recover_stale_creator_media_jobs', {
    p_after_seconds: STALE_RUNNING_SECONDS,
  });
  if (error) {
    console.warn('[worker] recover_stale_creator_media_jobs skipped:', error.message);
    return;
  }
  const n = typeof data === 'number' ? data : Number(data);
  if (n > 0) console.warn(`[worker] recovered ${n} stale running creator_media_jobs`);
}

async function finalizePermanentFailure(job, msg, lastCode) {
  const safe = msg.length > 2000 ? `${msg.slice(0, 1997)}…` : msg;
  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'failed',
      error: safe,
      last_error_code: lastCode,
      updated_at: terminalTs(),
      completed_at: terminalTs(),
    })
    .eq('id', job.id);

  await patchTargetPostOnFailure(job, safe);
  await patchLiveClipOnFailure(job, safe);
  console.error('[worker] failed permanently', job.id, job.kind, lastCode, msg);
}

async function requeueWithBackoff(job, msg, lastCode) {
  const safe = msg.length > 2000 ? `${msg.slice(0, 1997)}…` : msg;
  const when = new Date(Date.now() + backoffMs(job.attempt_count ?? 0)).toISOString();
  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'queued',
      error: safe,
      last_error_code: lastCode,
      next_retry_at: when,
      started_at: null,
      updated_at: terminalTs(),
      encode_complete: false,
      output: null,
    })
    .eq('id', job.id);
  console.warn('[worker] requeued transient', job.id, job.kind, lastCode, 'next_retry_at', when);
}

async function requeueAwaitingPostPatch(job, msg) {
  const safe = msg.length > 2000 ? `${msg.slice(0, 1997)}…` : msg;
  const when = new Date(Date.now() + backoffMs(job.attempt_count ?? 0)).toISOString();
  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'awaiting_post_patch',
      error: safe,
      last_error_code: 'POST_PATCH_FAILED',
      next_retry_at: when,
      started_at: null,
      updated_at: terminalTs(),
    })
    .eq('id', job.id);
  console.warn('[worker] post-patch will retry', job.id, 'next_retry_at', when);
}

async function markAwaitingPostPatch(job, output) {
  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'awaiting_post_patch',
      output,
      encode_complete: true,
      error: null,
      last_error_code: null,
      updated_at: terminalTs(),
      completed_at: null,
    })
    .eq('id', job.id);

  await setPostMediaProcessingStatus(job, 'running');
}

async function markSucceeded(job, output) {
  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'succeeded',
      output,
      error: null,
      last_error_code: null,
      updated_at: terminalTs(),
      completed_at: terminalTs(),
    })
    .eq('id', job.id);
}

async function runPatchOnlyPass(job) {
  const output = job.output;
  if (!output || typeof output !== 'object') {
    await finalizePermanentFailure(job, 'PATCH_ONLY_MISSING_OUTPUT', 'PERMANENT_PAYLOAD');
    return;
  }

  const posted = await patchTargetPostAfterStitch(job, output);
  if (posted) {
    await markSucceeded(job, output);
    console.log('[worker] succeeded (post-patch retry)', job.id, job.kind, output?.storagePath);
    return;
  }

  const msg = 'Post patch failed after encode (retry scheduled if attempts remain)';
  const maxA = typeof job.max_attempts === 'number' ? job.max_attempts : Number(job.max_attempts) || 5;
  const attempts = typeof job.attempt_count === 'number' ? job.attempt_count : Number(job.attempt_count) || 0;

  if (attempts >= maxA) {
    await finalizePermanentFailure(job, msg, 'POST_PATCH_FAILED');
    return;
  }

  await requeueAwaitingPostPatch(job, msg);
}

async function runFullEncodePass(job) {
  await execFileAsync('ffmpeg', ['-version'], { maxBuffer: 1024 * 1024 });
  await execFileAsync('ffprobe', ['-version'], { maxBuffer: 1024 * 1024 });

  const isGreenScreen =
    job.kind === 'video_composition' &&
    job.input &&
    typeof job.input === 'object' &&
    job.input.greenScreen &&
    typeof job.input.greenScreen === 'object';

  const output =
    job.kind === 'video_composition'
      ? isGreenScreen
        ? await processGreenScreenEncode(job)
        : await processCompositionEncode(job)
      : await processStitchOrBrollEncode(job);

  await markAwaitingPostPatch(job, output);

  const posted = await patchTargetPostAfterStitch(job, output);
  if (posted) {
    await markSucceeded(job, output);
    console.log(
      '[worker] succeeded',
      job.id,
      job.kind,
      output?.layerSummary ? `[${output.layerSummary}]` : '',
      output?.storagePath,
    );
    return;
  }

  const msg = 'Post patch failed after successful encode';
  const maxA = typeof job.max_attempts === 'number' ? job.max_attempts : Number(job.max_attempts) || 5;
  const attempts = typeof job.attempt_count === 'number' ? job.attempt_count : Number(job.attempt_count) || 0;

  if (attempts >= maxA) {
    await finalizePermanentFailure(job, msg, 'POST_PATCH_FAILED');
    return;
  }

  await requeueAwaitingPostPatch(job, msg);
}

async function processOne() {
  const { data: claimed, error: claimErr } = await supabase.rpc('claim_next_creator_media_job');

  if (claimErr) {
    console.error('[worker] claim_next_creator_media_job RPC failed — apply migrations 184/186?', claimErr.message);
    return;
  }

  const job = normalizeClaimedJob(claimed);
  if (!job?.id) {
    console.log('[worker] no queued stitch/broll/trim jobs');
    return;
  }

  const maxA = typeof job.max_attempts === 'number' ? job.max_attempts : Number(job.max_attempts) || 5;

  try {
    if (job.kind === 'trim') {
      await runTrimPass(job);
      return;
    }

    if (!isPostMediaKind(job.kind)) {
      throw new Error(
        `PERMANENT_PAYLOAD: Worker does not implement kind "${job.kind}" yet. Extend scripts/creator-media-worker.mjs or use stitch/broll/video_composition/trim.`,
      );
    }

    if (job.encode_complete && job.output) {
      await runPatchOnlyPass(job);
    } else {
      await runFullEncodePass(job);
    }
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    const { code, transient } = classifyFailure(e);

    const attempts = typeof job.attempt_count === 'number' ? job.attempt_count : Number(job.attempt_count) || 0;

    if (!transient || attempts >= maxA) {
      await finalizePermanentFailure(job, rawMsg, code);
      return;
    }

    await requeueWithBackoff(job, rawMsg, code);
  }
}

async function startHealthServer() {
  const port = Number(process.env.PORT || process.env.WORKER_HEALTH_PORT || 0);
  if (!Number.isFinite(port) || port <= 0) return;
  const { createServer } = await import('node:http');
  createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  }).listen(port, () => {
    console.log('[worker] health listening on', port);
  });
}

async function main() {
  await startHealthServer();
  await recoverStaleRunningOnce();

  if (!watch) {
    await processOne();
    return;
  }
  for (;;) {
    await processOne();
    await new Promise((r) => setTimeout(r, 5000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
