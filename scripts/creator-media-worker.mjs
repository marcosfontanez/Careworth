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
  if (!Number.isFinite(sec) || sec <= 0) {
    throw new Error(`PERMANENT_CORRUPT: invalid duration for ${localPath}`);
  }
  return sec;
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

async function setPostMediaProcessingStatus(job, status) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || (job.kind !== 'stitch' && job.kind !== 'broll')) return;

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
  if (!tid || (job.kind !== 'stitch' && job.kind !== 'broll')) return true;

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
  const isTargetKind =
    job.kind === 'stitch' || job.kind === 'broll' || (job.kind === 'trim' && tid);
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

  const output = await processStitchOrBrollEncode(job);

  await markAwaitingPostPatch(job, output);

  const posted = await patchTargetPostAfterStitch(job, output);
  if (posted) {
    await markSucceeded(job, output);
    console.log('[worker] succeeded', job.id, job.kind, output?.storagePath);
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

    if (job.kind !== 'stitch' && job.kind !== 'broll') {
      throw new Error(
        `PERMANENT_PAYLOAD: Worker does not implement kind "${job.kind}" yet. Extend scripts/creator-media-worker.mjs or use stitch/broll/trim.`,
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
