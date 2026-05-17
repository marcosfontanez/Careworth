#!/usr/bin/env node
import { Buffer } from 'node:buffer';

/**
 * Poll worker for `public.creator_media_jobs` (service role).
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CREATOR_MEDIA_BUCKET   optional, default `post-media`
 *
 * Requires **ffmpeg** on PATH for `stitch` and `broll` kinds (concat → MP4).
 *
 * ## Input contract (`input` jsonb)
 *
 * ### stitch
 * Concatenate clips **in order** (same codec/container may allow stream copy; mismatch triggers re-encode).
 * ```json
 * {
 *   "bucket": "post-media",
 *   "clipPaths": ["<user_id>/videos/a.mp4", "<user_id>/videos/b.mp4"],
 *   "outputPath": "<user_id>/exports/stitch-<optional>.mp4"
 * }
 * ```
 * - Every path must live under `<user_id>/` (matches job.user_id).
 * - `outputPath` optional; default `<user_id>/exports/<job_id>.mp4`
 *
 * ### broll
 * A-roll then each cutaway, concatenated (timeline = main + B-roll segments back-to-back; not PiP).
 * ```json
 * {
 *   "bucket": "post-media",
 *   "mainPath": "<user_id>/videos/main.mp4",
 *   "cutawayPaths": ["<user_id>/videos/br1.mp4"],
 *   "outputPath": "<user_id>/exports/broll-<optional>.mp4"
 * }
 * ```
 *
 * ### Success `output` jsonb
 * ```json
 * {
 *   "bucket": "post-media",
 *   "storagePath": "<user_id>/exports/<job_id>.mp4",
 *   "bytes": 1234567,
 *   "ffmpegMode": "copy" | "reencode",
 *   "clipCount": 3
 * }
 * ```
 *
 * Other `kind` values remain unsupported here (explicit failed row + message).
 *
 * Usage:
 *   node scripts/creator-media-worker.mjs           # one queued job
 *   node scripts/creator-media-worker.mjs --watch   # poll every 5s
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

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/** @param {string} userId */
function assertUserScopedStoragePath(userId, p) {
  if (typeof p !== 'string' || !p.trim()) throw new Error('invalid storage path');
  const normalized = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\/+/, '');
  if (normalized.includes('..')) throw new Error('path must not contain ..');
  const prefix = `${userId}/`;
  if (!normalized.startsWith(prefix)) throw new Error(`path must start with ${prefix}`);
  return normalized;
}

/** FFmpeg concat demuxer line */
function concatFileLine(absLocalPath) {
  const posix = absLocalPath.replace(/\\/g, '/');
  const escaped = posix.replace(/'/g, `'\\''`);
  return `file '${escaped}'`;
}

async function ffmpegConcat(localFiles, outPath, tryCopyFirst) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-media-'));
  const listPath = path.join(tmpDir, 'concat.txt');
  const lines = localFiles.map((f) => concatFileLine(path.resolve(f)));
  await fs.writeFile(listPath, `${lines.join('\n')}\n`, 'utf8');

  const run = async (args) => {
    await execFileAsync('ffmpeg', args, { maxBuffer: 20 * 1024 * 1024 });
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

async function downloadTo(supabaseClient, bucket, storagePath, destFsPath) {
  const { data, error } = await supabaseClient.storage.from(bucket).download(storagePath);
  if (error || !data) throw new Error(error?.message || 'download failed');
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length === 0) throw new Error(`empty object: ${storagePath}`);
  await fs.mkdir(path.dirname(destFsPath), { recursive: true });
  await fs.writeFile(destFsPath, buf);
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
      throw new Error('stitch requires input.clipPaths: non-empty string[]');
    }
    const clipPaths = clipPathsRaw.map((p, i) => {
      if (typeof p !== 'string') throw new Error(`clipPaths[${i}] must be string`);
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
    if (typeof mainPathRaw !== 'string') throw new Error('broll requires input.mainPath: string');
    if (!Array.isArray(cutawaysRaw)) throw new Error('broll requires input.cutawayPaths: string[]');
    const mainPath = assertUserScopedStoragePath(uid, mainPathRaw.trim());
    const cutaways = cutawaysRaw.map((p, i) => {
      if (typeof p !== 'string') throw new Error(`cutawayPaths[${i}] must be string`);
      return assertUserScopedStoragePath(uid, p.trim());
    });
    const clipPaths = [mainPath, ...cutaways];
    let outputPath =
      typeof input.outputPath === 'string' && input.outputPath.trim()
        ? assertUserScopedStoragePath(uid, input.outputPath.trim())
        : `${uid}/exports/broll-${job.id}.mp4`;
    return { bucket, clipPaths, outputPath };
  }

  throw new Error(`unsupported kind: ${job.kind}`);
}

async function processStitchOrBroll(job) {
  const { bucket, clipPaths, outputPath } = normalizeStitchOrBroll(job);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-job-'));
  const locals = [];
  try {
    for (let i = 0; i < clipPaths.length; i += 1) {
      const sp = clipPaths[i];
      const ext = path.extname(sp) || '.mp4';
      const local = path.join(workDir, `seg_${i}${ext}`);
      await downloadTo(supabase, bucket, sp, local);
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
    if (upErr) throw new Error(upErr.message);

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
 * When input.target_post_id is set, patch posts.media_url after successful concat.
 */
async function patchTargetPostAfterStitch(job, output) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || (job.kind !== 'stitch' && job.kind !== 'broll')) return;

  const { data: postRow, error: selErr } = await supabase
    .from('posts')
    .select('id, creator_id')
    .eq('id', tid)
    .maybeSingle();
  if (selErr || !postRow || postRow.creator_id !== job.user_id) {
    console.error('[worker] target_post_id invalid or ownership mismatch', tid, selErr?.message);
    return;
  }

  const bucket = output.bucket;
  const storagePath = output.storagePath;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const mediaUrl = pub?.publicUrl?.trim();
  if (!mediaUrl) {
    console.error('[worker] getPublicUrl returned empty for stitched output');
    return;
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
  if (upErr) console.error('[worker] posts patch after stitch failed', upErr.message);
}

async function patchTargetPostOnFailure(job, errorMsg) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const tid = typeof input.target_post_id === 'string' ? input.target_post_id.trim() : '';
  if (!tid || (job.kind !== 'stitch' && job.kind !== 'broll')) return;

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

async function processOne() {
  const { data: jobs, error: qErr } = await supabase
    .from('creator_media_jobs')
    .select('id, kind, input, user_id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1);

  if (qErr) {
    console.error('[worker] query', qErr.message);
    return;
  }

  const job = jobs?.[0];
  if (!job) {
    console.log('[worker] no queued jobs');
    return;
  }

  const now = new Date().toISOString();
  await supabase.from('creator_media_jobs').update({ status: 'running', updated_at: now }).eq('id', job.id);

  try {
    let output = null;

    if (job.kind === 'stitch' || job.kind === 'broll') {
      await execFileAsync('ffmpeg', ['-version'], { maxBuffer: 1024 * 1024 });
      output = await processStitchOrBroll(job);
    } else {
      throw new Error(
        `Worker does not implement kind "${job.kind}" yet. Extend scripts/creator-media-worker.mjs or use stitch/broll.`,
      );
    }

    await supabase
      .from('creator_media_jobs')
      .update({
        status: 'succeeded',
        output,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log('[worker] succeeded', job.id, job.kind, output?.storagePath);

    await patchTargetPostAfterStitch(job, output);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from('creator_media_jobs')
      .update({
        status: 'failed',
        error: msg.length > 2000 ? `${msg.slice(0, 1997)}…` : msg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    await patchTargetPostOnFailure(job, msg);

    console.error('[worker] failed', job.id, job.kind, msg);
  }
}

async function main() {
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
