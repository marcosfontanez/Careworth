import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Source download failed (${res.status})`);
  }
  if (!res.body) {
    throw new Error('Source download had no body');
  }
  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(dest));
}

async function probeHasAudio(file: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file],
      { maxBuffer: 65536 },
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function ffmpegOnce(args: string[], jobId: string, stage: string): Promise<void> {
  const t0 = Date.now();
  console.log('[duet-mux]', jobId, 'ffmpeg', stage, 'start');
  try {
    await execFileAsync('ffmpeg', args, { maxBuffer: 64 * 1024 * 1024 });
    console.log('[duet-mux]', jobId, 'ffmpeg', stage, 'done', `${Date.now() - t0}ms`);
  } catch (e) {
    console.error('[duet-mux]', jobId, 'ffmpeg', stage, 'FAILED', `${Date.now() - t0}ms`, (e as Error)?.message);
    throw e;
  }
}

/**
 * Side-by-side portrait mux (1080×1920): original clip left, creator clip right — matches in-feed duet layout
 * as a single uploaded MP4 (Phase B). Audio: mix when both streams exist; otherwise first available track.
 */
export async function runDuetMuxPipeline(opts: {
  jobId: string;
  workDir: string;
  leftVideoUrl: string;
  rightVideoUrl: string;
  onProgress: (p: number) => void;
}): Promise<string> {
  const { jobId, workDir, leftVideoUrl, rightVideoUrl, onProgress } = opts;
  const left = path.join(workDir, 'duet_left.mp4');
  const right = path.join(workDir, 'duet_right.mp4');

  console.log('[duet-mux]', jobId, 'download left');
  await downloadToFile(leftVideoUrl, left);
  onProgress(0.14);

  console.log('[duet-mux]', jobId, 'download right');
  await downloadToFile(rightVideoUrl, right);
  onProgress(0.26);

  const a0 = await probeHasAudio(left);
  const a1 = await probeHasAudio(right);

  const scalePad =
    'scale=540:1920:force_original_aspect_ratio=decrease,pad=540:1920:(ow-iw)/2:(oh-ih)/2,setsar=1';
  const vChain = `[0:v]${scalePad}[dl];[1:v]${scalePad}[dr];[dl][dr]hstack=inputs=2[outv]`;

  let filterComplex: string;
  let hasAudioOut = false;

  if (a0 && a1) {
    filterComplex = `${vChain};[0:a][1:a]amix=inputs=2:duration=shortest:normalize=0[outa]`;
    hasAudioOut = true;
  } else {
    filterComplex = vChain;
    hasAudioOut = a0 || a1;
  }

  const out = path.join(workDir, 'duet_merged.mp4');

  const args: string[] = ['-y', '-i', left, '-i', right, '-filter_complex', filterComplex, '-map', '[outv]'];

  if (a0 && a1) {
    args.push('-map', '[outa]');
  } else if (a1) {
    args.push('-map', '1:a');
  } else if (a0) {
    args.push('-map', '0:a');
  } else {
    args.push('-an');
  }

  args.push(
    '-shortest',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '26',
    '-tune',
    'fastdecode',
    '-pix_fmt',
    'yuv420p',
  );

  if (hasAudioOut) {
    args.push('-c:a', 'aac', '-ar', '48000', '-b:a', '128k');
  }

  args.push('-threads', '2', out);

  onProgress(0.32);
  await ffmpegOnce(args, jobId, 'hstack-encode');
  onProgress(0.9);

  await fs.access(out).catch(() => {
    throw new Error('Duet mux produced no output file');
  });

  return out;
}
