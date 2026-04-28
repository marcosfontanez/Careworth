import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkExportRateLimit } from './rateLimit.js';
import { runExportPipeline } from './pipeline.js';
import { uploadExportMp4 } from './storage.js';
import type { JobRecord, VideoExportJobRequestBody } from './types.js';

const jobs = new Map<string, JobRecord>();

// Single-CPU worker — serialize jobs so concurrent requests don't choke ffmpeg.
let queue: Promise<void> = Promise.resolve();
function enqueue(work: () => Promise<void>): void {
  queue = queue.then(work, work);
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function createJob(userId: string, body: VideoExportJobRequestBody): JobRecord {
  checkExportRateLimit(userId);
  const id = randomUUID();
  const job: JobRecord = {
    id,
    userId,
    postId: body.postId,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
    anonymousExport: body.anonymousExport,
    request: body,
  };
  jobs.set(id, job);
  console.log('[export]', id, body.postId, 'queued');

  enqueue(() => runJob(job));

  return job;
}

async function runJob(job: JobRecord): Promise<void> {
  const j = jobs.get(job.id);
  if (!j) return;
  j.status = 'processing';
  j.progress = 0.05;
  const t0 = Date.now();
  console.log('[export]', job.id, 'processing start');

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pv-export-'));
  try {
    const outPath = await runExportPipeline({
      jobId: job.id,
      workDir: tmp,
      sourceVideoUrl: j.request.sourceVideoUrl,
      endCard: j.request.endCard,
      burnWatermark: j.request.burnWatermark,
      onProgress: (p) => {
        const cur = jobs.get(job.id);
        if (cur) cur.progress = Math.min(0.95, p);
      },
    });

    const objectPath = `${j.userId}/${j.id}.mp4`;
    console.log('[export]', job.id, 'upload begin', objectPath);
    const u0 = Date.now();
    const signed = await uploadExportMp4(outPath, objectPath);
    console.log('[export]', job.id, 'upload done', `${Date.now() - u0}ms`);

    const done = jobs.get(job.id);
    if (done) {
      done.status = 'completed';
      done.progress = 1;
      done.outputUrl = signed;
    }
    console.log('[export]', job.id, 'completed', `${Date.now() - t0}ms total`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[export]', job.id, job.postId, 'FAILED', `${Date.now() - t0}ms`, msg);
    const failed = jobs.get(job.id);
    if (failed) {
      failed.status = 'failed';
      failed.error = msg.length > 200 ? `${msg.slice(0, 197)}…` : msg;
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/** Prune old jobs from memory (best-effort; deploy with restart or add Redis later). */
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, j] of jobs) {
    if (j.createdAt < cutoff && (j.status === 'completed' || j.status === 'failed')) {
      jobs.delete(id);
    }
  }
}, 60 * 60 * 1000).unref();
