import { execFile, spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { formatCreatorHandle, getEndCardCreatorLines } from './endCardLines.js';
import type { ExportEndCardData } from './types.js';

const execFileAsync = promisify(execFile);

const ENDCARD_DURATION_SEC = 5;

const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT_BOOK = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

function bundledDir(): string {
  const fromEnv = process.env.BUNDLED_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.resolve(process.cwd(), 'bundled');
}

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

function escPath(p: string): string {
  return path.resolve(p).replace(/\\/g, '/').replace(/:/g, '\\:');
}

function escFont(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function buildDrawtextChain(workDir: string, data: ExportEndCardData): string {
  const { primary, secondary, showNameUnderHandle, display } = getEndCardCreatorLines(data);
  const parts: string[] = [];
  let i = 0;

  const draw = (
    text: string,
    opts: {
      size: number;
      yFromBottom: number;
      color: string;
      font: string;
    },
  ) => {
    const tf = path.join(workDir, `dt_${i++}.txt`);
    writeFileSync(tf, text, 'utf8');
    const styling = `:shadowx=2:shadowy=2:shadowcolor=black@0.6`;
    parts.push(
      `drawtext=fontfile=${escFont(opts.font)}:textfile=${escPath(tf)}:fontsize=${opts.size}:fontcolor=${opts.color}:x=(w-text_w)/2:y=h-${opts.yFromBottom}${styling}`,
    );
  };

  const hasHandle = primary.startsWith('@');

  if (hasHandle || display) {
    draw('FIND MORE FROM', {
      size: 22,
      yFromBottom: 470,
      color: 'white@0.78',
      font: FONT_BOOK,
    });
  }

  draw(primary, {
    size: hasHandle ? 46 : 44,
    yFromBottom: 388,
    color: 'white',
    font: FONT_BOLD,
  });

  if (showNameUnderHandle && display) {
    draw(display, {
      size: 26,
      yFromBottom: 308,
      color: 'white@0.92',
      font: FONT_BOOK,
    });
  }

  if (secondary) {
    draw(secondary, {
      size: 22,
      yFromBottom: 260,
      color: 'gray@0.9',
      font: FONT_BOOK,
    });
  }

  draw('PULSEVERSE', {
    size: 54,
    yFromBottom: 170,
    color: '0x19D3C5',
    font: FONT_BOLD,
  });

  draw('Search to follow on the app', {
    size: 18,
    yFromBottom: 112,
    color: 'white@0.7',
    font: FONT_BOOK,
  });

  return parts.join(',');
}

async function ffmpeg(args: string[], jobId: string, stage: string): Promise<void> {
  const t0 = Date.now();
  console.log('[export]', jobId, 'ffmpeg', stage, 'start');
  try {
    await execFileAsync('ffmpeg', args, { maxBuffer: 64 * 1024 * 1024 });
    console.log('[export]', jobId, 'ffmpeg', stage, 'done', `${Date.now() - t0}ms`);
  } catch (e) {
    console.error('[export]', jobId, 'ffmpeg', stage, 'FAILED', `${Date.now() - t0}ms`, (e as Error)?.message);
    throw e;
  }
}

// Hard ceiling on any single ffmpeg encode. Beyond this the shared CPU is almost certainly
// stuck and the job should fail loudly rather than wedge the queue forever.
const FFMPEG_HARD_TIMEOUT_MS = 6 * 60 * 1000;
// Long enough for ffprobe to sniff a non-faststart MP4 with moov at the end on a shared CPU.
const FFPROBE_TIMEOUT_MS = 20 * 1000;
// Cap reported encode progress below 1.0 — ffmpeg keeps emitting status during muxer
// finalization (writing moov, fastsstart shuffle), and our duration estimate may be slightly
// off. Pinning the bar at 99% avoids the "stuck at 100%" UX while we wait for clean exit.
const PROGRESS_PLATEAU = 0.99;

/**
 * Spawn ffmpeg with `-progress pipe:1` so we can stream a real progress fraction
 * back to the client throughout the encode (not just before/after).
 *
 * `expectedDurationSec` may be `null` when ffprobe failed or wasn't run — in that case
 * we stop reporting fractions and emit a heartbeat so the UI shows indeterminate progress
 * instead of a wrong percentage.
 */
async function ffmpegStreamingProgress(
  args: string[],
  jobId: string,
  stage: string,
  expectedDurationSec: number | null,
  onFraction: (f: number | null) => void,
): Promise<void> {
  const t0 = Date.now();
  const expectedTxt = expectedDurationSec ? `${expectedDurationSec.toFixed(1)}s` : 'unknown';
  console.log('[export]', jobId, 'ffmpeg', stage, 'start (streaming, expected', expectedTxt + ')');

  return new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderrTail = '';
    let buf = '';
    let lastReport = 0;
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      if (heartbeat) clearInterval(heartbeat);
      if (postExceedHeartbeat) clearInterval(postExceedHeartbeat);
      fn();
    };

    const killer = setTimeout(() => {
      console.error('[export]', jobId, 'ffmpeg', stage, 'TIMEOUT after', `${FFMPEG_HARD_TIMEOUT_MS}ms — killing`);
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      settle(() => reject(new Error(`ffmpeg ${stage} timed out`)));
    }, FFMPEG_HARD_TIMEOUT_MS);

    // When duration is unknown we still want the client to know the worker is alive,
    // so emit a `null` heartbeat every few seconds — the UI treats null as "spinner".
    const heartbeat = expectedDurationSec
      ? null
      : setInterval(() => onFraction(null), 3000);

    // If real progress runs past the estimated duration (probe was wrong), stop
    // reporting fractions and start emitting heartbeats — same indeterminate UX as
    // when probe failed entirely.
    let exceededEstimate = false;
    let postExceedHeartbeat: NodeJS.Timeout | undefined;

    child.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const match = /^out_time_us=(\d+)/.exec(line);
        if (match && expectedDurationSec && expectedDurationSec > 0 && !exceededEstimate) {
          const us = Number(match[1]);
          const raw = us / (expectedDurationSec * 1_000_000);

          if (raw > 1.0) {
            // Encode has run past our expected duration — probe must have been
            // off. Switch to indeterminate so the bar doesn't lock at 99%.
            exceededEstimate = true;
            console.log(
              '[export]', jobId, 'ffmpeg', stage,
              'probe exceeded → switching to indeterminate (out_time',
              `${(us / 1_000_000).toFixed(1)}s vs expected ${expectedDurationSec.toFixed(1)}s)`,
            );
            postExceedHeartbeat = setInterval(() => onFraction(null), 3000);
            continue;
          }

          const frac = Math.min(PROGRESS_PLATEAU, Math.max(0, raw));
          const now = Date.now();
          if (now - lastReport > 750 || frac >= PROGRESS_PLATEAU) {
            lastReport = now;
            onFraction(frac);
            console.log('[export]', jobId, 'ffmpeg', stage, 'progress', `${(frac * 100).toFixed(1)}%`);
          }
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const s = chunk.toString('utf8');
      stderrTail = (stderrTail + s).slice(-4000);
    });

    child.on('error', (err) => {
      console.error('[export]', jobId, 'ffmpeg', stage, 'spawn error', err.message);
      settle(() => reject(err));
    });

    child.on('close', (code) => {
      const ms = Date.now() - t0;
      if (code === 0) {
        console.log('[export]', jobId, 'ffmpeg', stage, 'done', `${ms}ms`);
        settle(() => resolve());
      } else {
        console.error('[export]', jobId, 'ffmpeg', stage, 'FAILED', `${ms}ms`, `exit ${code}`);
        console.error('[export]', jobId, 'ffmpeg stderr tail:\n' + stderrTail);
        settle(() => reject(new Error(`ffmpeg exited ${code}: ${stderrTail.trim().slice(-500)}`)));
      }
    });
  });
}

/**
 * Returns the source video duration in seconds, or `null` if it can't be determined.
 *
 * Uses aggressive `-probesize` / `-analyzeduration` hints because the default ffprobe behavior
 * scans the whole file when the moov atom is at the end of an MP4 (common for iOS recordings).
 * On a shared-CPU Fly machine that can take 8+ seconds for non-faststart 4K clips.
 */
async function probeDurationSec(file: string, jobId: string): Promise<number | null> {
  const t0 = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const proc = execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        // Cap how much ffprobe reads when sniffing format / streams. Plenty for an mp4 header.
        '-probesize', '5000000',
        '-analyzeduration', '5000000',
        '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1',
        file,
      ],
      { maxBuffer: 1 * 1024 * 1024 },
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('ffprobe timeout')), FFPROBE_TIMEOUT_MS);
    });
    const { stdout } = await Promise.race([proc, timeoutPromise]);
    const n = Number(String(stdout).trim());
    console.log('[export]', jobId, 'ffprobe duration', `${(Date.now() - t0)}ms ->`, n, 'sec');
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (e) {
    console.warn('[export]', jobId, 'ffprobe failed', `${(Date.now() - t0)}ms`, (e as Error)?.message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * TikTok-style bouncing watermark: cycles through 4 corners every 5 seconds.
 *
 * Layout (1080x1920 portrait), stacked vertically and centered to the logo column:
 *   1. Logo PNG sized to LOGO_PX × LOGO_PX, ~70% alpha
 *   2. "PULSEVERSE" wordmark directly below the logo (tight)
 *   3. Creator handle (e.g. "@marcos.fontanez") below the wordmark (tight)
 * All three positions share the same time-based switch so they always move together.
 *
 * Sizes are tuned to feel compact — tight line spacing with no breathing
 * room between the logo, wordmark, and handle, so the whole mark reads as
 * one object rather than three floating labels.
 */
const LOGO_PX = 170;
const SIDE_MARGIN = 40;
const TOP_MARGIN = 96;
const BOTTOM_MARGIN = 300;
const WORDMARK_OFFSET = 4; // tight gap from logo bottom to wordmark top
const WORDMARK_SIZE = 30;
const HANDLE_OFFSET = 2; // tight gap from wordmark bottom to handle top
const HANDLE_SIZE = 22;
const CYCLE_SEC = 20;
const CORNER_SEC = 5;

/**
 * Builds an FFmpeg expression that switches between four values based on `mod(t, CYCLE_SEC)`.
 * Order: [topRight, topLeft, bottomLeft, bottomRight].
 */
function bounceExpr(values: [string, string, string, string]): string {
  const [tr, tl, bl, br] = values;
  return (
    `if(lt(mod(t\\,${CYCLE_SEC})\\,${CORNER_SEC})\\,${tr}\\,` +
    `if(lt(mod(t\\,${CYCLE_SEC})\\,${CORNER_SEC * 2})\\,${tl}\\,` +
    `if(lt(mod(t\\,${CYCLE_SEC})\\,${CORNER_SEC * 3})\\,${bl}\\,${br})))`
  );
}

function buildBouncingWatermark(workDir: string, endCard: ExportEndCardData): {
  filter: string;
  output: string;
  cleanup: string[];
} {
  // Logo overlay top-left coordinates per corner (referencing main video W/H + overlay w/h).
  const logoX = bounceExpr([
    `W-w-${SIDE_MARGIN}`,
    `${SIDE_MARGIN}`,
    `${SIDE_MARGIN}`,
    `W-w-${SIDE_MARGIN}`,
  ]);
  const logoY = bounceExpr([
    `${TOP_MARGIN}`,
    `${TOP_MARGIN}`,
    `H-h-${BOTTOM_MARGIN}`,
    `H-h-${BOTTOM_MARGIN}`,
  ]);

  // Scale the pre-built RGBA watermark down to LOGO_PX and apply opacity.
  //
  // Build-time note: the bundled `pulseverse-watermark.png` is generated by the
  // Dockerfile from the source logo via `colorkey=0x000000:0.30:0.10` →
  // `format=rgba` so the black background is replaced with real transparency
  // *before* the worker even starts. That means at runtime we just need to:
  //   1. assert rgba format (so colorchannelmixer's alpha math is well-defined),
  //   2. scale to LOGO_PX preserving aspect (logo is square so no letterbox),
  //   3. multiply alpha by 0.7 for the inconspicuous see-through look.
  // No padding, no second format conversion, no chroma-key at runtime — all of
  // that already happened at build time.
  const wmPrep =
    `[2:v]format=rgba,` +
    `scale=${LOGO_PX}:${LOGO_PX}:force_original_aspect_ratio=decrease,` +
    `colorchannelmixer=aa=0.7[wm]`;

  // The stack below the logo is two lines:
  //   line 1: "PULSEVERSE" (brand wordmark, teal, always drawn)
  //   line 2: "@handle"     (creator, white, only when we have a handle)
  //
  // Both are horizontally centered to the logo column and bounced in lockstep
  // with the logo so they always move together. Y coordinates are computed
  // as fixed offsets from the logo's Y anchor — for top corners that's
  // `TOP_MARGIN + LOGO_PX + offset`; for bottom corners it's measured up
  // from the frame's bottom edge as `H - BOTTOM_MARGIN + offset` so the
  // stack grows DOWN from the logo in all four corners.
  const handle =
    formatCreatorHandle(endCard.creatorHandle) ?? endCard.creatorDisplayName?.trim() ?? '';
  const cleanup: string[] = [];

  // Centered-to-logo-column X. Logo width is fixed at LOGO_PX so
  // center_x = logo_left + LOGO_PX/2, offset by text_w/2 for the text baseline.
  const colCenterX = (rightCorner: boolean) =>
    rightCorner
      ? `W-${LOGO_PX}-${SIDE_MARGIN}+(${LOGO_PX}-text_w)/2`
      : `${SIDE_MARGIN}+(${LOGO_PX}-text_w)/2`;

  // ----- Wordmark (always drawn) -----
  const wordmarkFile = path.join(workDir, 'wm_wordmark.txt');
  writeFileSync(wordmarkFile, 'PULSEVERSE', 'utf8');
  cleanup.push(wordmarkFile);

  const wordmarkX = bounceExpr([
    colCenterX(true),
    colCenterX(false),
    colCenterX(false),
    colCenterX(true),
  ]);
  const wordmarkY = bounceExpr([
    // Top corners: immediately below the logo.
    `${TOP_MARGIN + LOGO_PX + WORDMARK_OFFSET}`,
    `${TOP_MARGIN + LOGO_PX + WORDMARK_OFFSET}`,
    // Bottom corners: measured from frame bottom so the stack still grows DOWN
    // from the logo. Logo's bottom edge lives at `H - BOTTOM_MARGIN + LOGO_PX`,
    // so the wordmark sits `WORDMARK_OFFSET` below that.
    `H-${BOTTOM_MARGIN}+${LOGO_PX + WORDMARK_OFFSET}`,
    `H-${BOTTOM_MARGIN}+${LOGO_PX + WORDMARK_OFFSET}`,
  ]);
  const wordmarkFilter =
    `,drawtext=fontfile=${escFont(FONT_BOLD)}` +
    `:textfile=${escPath(wordmarkFile)}` +
    `:fontsize=${WORDMARK_SIZE}:fontcolor=white@0.95` +
    `:shadowx=2:shadowy=2:shadowcolor=black@0.7` +
    `:x='${wordmarkX}':y='${wordmarkY}'`;

  // ----- Creator handle (conditional) -----
  let handleFilter = '';
  if (handle) {
    const handleFile = path.join(workDir, 'wm_handle.txt');
    writeFileSync(handleFile, handle, 'utf8');
    cleanup.push(handleFile);

    const handleX = bounceExpr([
      colCenterX(true),
      colCenterX(false),
      colCenterX(false),
      colCenterX(true),
    ]);
    // Handle sits below the wordmark: logo_bottom + WORDMARK_OFFSET + WORDMARK_SIZE + HANDLE_OFFSET.
    const handleStackOffset = WORDMARK_OFFSET + WORDMARK_SIZE + HANDLE_OFFSET;
    const handleY = bounceExpr([
      `${TOP_MARGIN + LOGO_PX + handleStackOffset}`,
      `${TOP_MARGIN + LOGO_PX + handleStackOffset}`,
      `H-${BOTTOM_MARGIN}+${LOGO_PX + handleStackOffset}`,
      `H-${BOTTOM_MARGIN}+${LOGO_PX + handleStackOffset}`,
    ]);
    handleFilter =
      `,drawtext=fontfile=${escFont(FONT_BOOK)}` +
      `:textfile=${escPath(handleFile)}` +
      `:fontsize=${HANDLE_SIZE}:fontcolor=white@0.88` +
      `:shadowx=2:shadowy=2:shadowcolor=black@0.7` +
      `:x='${handleX}':y='${handleY}'`;
  }

  // Build a single filter chain: overlay -> (optional drawtext) -> labeled output.
  // The label MUST come at the very end of the chain so the overlay's output is
  // consumed by the next filter (drawtext) instead of being terminated early.
  //
  // Default overlay behavior is what we want here:
  //   - `eof_action=repeat` (default): when the single-frame watermark EOFs after
  //     1 frame, keep using that frame for every subsequent background frame.
  //   - `shortest=0` (default): overlay output is driven by the MAIN input
  //     (background = source video). When the source ends, overlay ends.
  //
  // Do NOT add `shortest=1` here — with a single-frame watermark that would
  // terminate overlay after exactly 1 frame, leaving the audio chain orphaned
  // and crashing concat downstream. Do NOT re-add `-loop 1` to the watermark
  // input either — that makes it infinite and overlay would run forever.
  const composite = `[m_norm][wm]overlay=x='${logoX}':y='${logoY}':format=auto${wordmarkFilter}${handleFilter}[mwm]`;

  return {
    filter: `${wmPrep};${composite}`,
    output: '[mwm]',
    cleanup,
  };
}

export async function runExportPipeline(opts: {
  jobId: string;
  workDir: string;
  sourceVideoUrl: string;
  endCard: ExportEndCardData;
  burnWatermark: boolean;
  onProgress: (p: number) => void;
}): Promise<string> {
  const { jobId, workDir, sourceVideoUrl, endCard, burnWatermark, onProgress } = opts;
  const bundle = bundledDir();
  const endMaster = path.join(bundle, 'pulseverse-endcard.mp4');
  const watermarkPng = path.join(bundle, 'pulseverse-watermark.png');

  await fs.access(endMaster).catch(() => {
    throw new Error(`Missing bundled end card at ${endMaster}`);
  });
  if (burnWatermark) {
    await fs.access(watermarkPng).catch(() => {
      throw new Error(`Missing bundled watermark PNG at ${watermarkPng}`);
    });
  }

  const src = path.join(workDir, 'source.mp4');
  console.log('[export]', jobId, 'download source begin');
  const dt0 = Date.now();
  await downloadToFile(sourceVideoUrl, src);
  console.log('[export]', jobId, 'download source done', `${Date.now() - dt0}ms`);
  onProgress(0.18);

  const sourceDurationSec = await probeDurationSec(src, jobId);
  const totalOutputSec = sourceDurationSec != null ? sourceDurationSec + ENDCARD_DURATION_SEC : null;
  console.log(
    '[export]', jobId, 'source duration',
    sourceDurationSec != null ? `${sourceDurationSec.toFixed(2)}s, total out ${totalOutputSec?.toFixed(2)}s` : 'unknown',
  );

  const drawtextChain = buildDrawtextChain(workDir, endCard);

  // Blurred-backdrop fill: the output is ALWAYS 1080x1920, and non-portrait
  // sources (16:9 screen recordings, horizontal phone shots) no longer render
  // with black bars. We split the source, use a scaled-up + blurred copy as
  // the backdrop, and overlay the original aspect-preserved clip on top. Net
  // effect: cinematic fill, no content loss, no dead black space.
  //
  //   [0:v]split=2[nfg][nbg]
  //   [nbg] scale-to-fill + crop + gaussian blur + slightly darkened = backdrop
  //   [nfg] scale-to-fit  (letterbox-size, unchanged aspect)          = foreground
  //   overlay fg centered on bg, force 30fps, labeled output
  const normalizeChain = (outLabel: string): string => {
    const bg =
      `scale=1080:1920:force_original_aspect_ratio=increase,` +
      `crop=1080:1920,` +
      `gblur=sigma=30,` +
      `eq=brightness=-0.15:saturation=1.08`;
    const fg = `scale=1080:1920:force_original_aspect_ratio=decrease`;
    return (
      `[0:v]split=2[nfg][nbg];` +
      `[nbg]${bg}[nbgb];` +
      `[nfg]${fg}[nfgs];` +
      `[nbgb][nfgs]overlay=(W-w)/2:(H-h)/2:format=auto,setsar=1,fps=30${outLabel}`
    );
  };

  // Inputs: [0]=source, [1]=end card master, [2]=watermark PNG (only when burning).
  // IMPORTANT: do NOT use `-loop 1` for the watermark. With a looped image input the
  // overlay filter (default `shortest=0`) treats the watermark as the longest stream
  // and runs forever, which causes ffmpeg to hang indefinitely after the source ends
  // (you'd see progress lock at ~99% and the encode never terminate). A single-frame
  // image input with the overlay's default `eof_action=repeat` does exactly what we
  // want: hold the watermark on screen for the duration of the source and stop when
  // the source video ends.
  const inputs: { args: string[] }[] = [{ args: ['-i', src] }, { args: ['-i', endMaster] }];
  if (burnWatermark) inputs.push({ args: ['-i', watermarkPng] });
  const endIdx = 1;

  let mainChain: string;
  let mainOut: string;
  if (burnWatermark) {
    const wm = buildBouncingWatermark(workDir, endCard);
    // Normalize writes into `[m_norm]`, which the watermark chain consumes.
    mainChain = `${normalizeChain('[m_norm]')};${wm.filter}`;
    mainOut = wm.output;
  } else {
    mainChain = normalizeChain('[m]');
    mainOut = '[m]';
  }

  // End card is pre-normalized to 1080x1920 / 30fps / 48k stereo at Docker build
  // time (see Dockerfile.export-worker), so we only need to apply drawtext on top.
  const endChain = drawtextChain
    ? `[${endIdx}:v]${drawtextChain}[ev]`
    : `[${endIdx}:v]copy[ev]`;
  // Source audio still needs aresample because the user's clip can be any
  // sample rate. The end card is already 48k stereo so we just label it through.
  const audioChain = `[0:a]aresample=async=1:first_pts=0,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[ma];[${endIdx}:a]anull[ea]`;
  const concatChain = `${mainOut}[ma][ev][ea]concat=n=2:v=1:a=1[outv][outa]`;

  const filterComplex = [mainChain, endChain, audioChain, concatChain].join(';');

  const out = path.join(workDir, 'out.mp4');
  const args: string[] = ['-y'];
  for (const inp of inputs) {
    args.push(...inp.args);
  }
  args.push(
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    // `ultrafast` is ~30-40% faster than `superfast`. The output is slightly larger,
    // but for short-form video (<3 min) the size delta is negligible vs the wall-clock
    // win on a shared-CPU machine.
    '-preset', 'ultrafast',
    // Cap visual quality drift from the looser preset.
    '-crf', '26',
    // `fastdecode` skips encoder features that slow playback decoding —
    // also slightly speeds up the encoder itself on weak CPUs.
    '-tune', 'fastdecode',
    // Bound keyframe spacing so seeking still works without paying for too many.
    '-x264-params', 'keyint=120:min-keyint=24:scenecut=0',
    '-pix_fmt', 'yuv420p',
    // NOTE: deliberately not using `-movflags +faststart`. It rewrites the output
    // file at the end (moov-atom shuffle), which adds 5-15s of muxer-finalization
    // wall-clock on shared CPUs. We deliver via signed URL → mobile client downloads
    // the whole file before playing, so faststart isn't necessary.
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',
    '-threads', '2',
    '-progress', 'pipe:1',
    '-nostats',
    out,
  );

  // Map ffmpeg's 0..1 progress fraction into our 0.18..0.90 band so the bar
  // smoothly advances during the encode (the rest is reserved for upload).
  // When duration was unknown, ffmpeg sends `null` heartbeats — translate those
  // into a slowly creeping fake number so the user still sees motion without us
  // claiming false precision.
  let lastFakeProgress = 0.18;
  await ffmpegStreamingProgress(args, jobId, 'one-pass', totalOutputSec, (frac) => {
    if (frac == null) {
      // Heartbeat from indeterminate stream — drift toward 0.85 over time.
      lastFakeProgress = Math.min(0.85, lastFakeProgress + 0.02);
      onProgress(lastFakeProgress);
      return;
    }
    const mapped = 0.18 + frac * (0.9 - 0.18);
    onProgress(Math.max(0.18, Math.min(0.9, mapped)));
  });
  onProgress(0.92);
  return out;
}
