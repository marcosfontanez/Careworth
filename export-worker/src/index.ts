import express from 'express';
import { verifySupabaseJwt, AuthError } from './auth.js';
import { createJob, getJob } from './jobs.js';
import type { VideoExportJobRequestBody } from './types.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pulseverse-export' });
});

app.post('/v1/video-export', async (req, res) => {
  try {
    const { sub } = await verifySupabaseJwt(req.headers.authorization);
    const body = req.body as VideoExportJobRequestBody;
    if (!body?.sourceVideoUrl?.trim()) {
      res.status(400).json({ error: 'sourceVideoUrl required' });
      return;
    }
    if (!body?.postId?.trim()) {
      res.status(400).json({ error: 'postId required' });
      return;
    }
    if (!body?.endCard?.creatorDisplayName?.trim()) {
      res.status(400).json({ error: 'endCard.creatorDisplayName required' });
      return;
    }

    const job = createJob(sub, body);
    res.status(200).json({ jobId: job.id });
  } catch (e) {
    if (e instanceof AuthError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    const status = typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 500;
    const msg = e instanceof Error ? e.message : 'Export failed';
    if (status === 429) {
      res.status(429).json({ error: msg });
      return;
    }
    console.error('[export] POST', e);
    res.status(500).json({ error: msg });
  }
});

app.get('/v1/video-export/jobs/:jobId', async (req, res) => {
  try {
    const { sub } = await verifySupabaseJwt(req.headers.authorization);
    const job = getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (job.userId !== sub) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (job.status === 'completed') {
      res.json({ status: 'completed', outputUrl: job.outputUrl, progress: 1 });
      return;
    }
    if (job.status === 'failed') {
      res.json({ status: 'failed', error: job.error ?? 'Unknown error' });
      return;
    }
    res.json({
      status: job.status === 'queued' ? 'queued' : 'processing',
      progress: job.progress,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    console.error('[export] GET job', e);
    res.status(500).json({ error: 'Status failed' });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`[pulseverse-export] listening on :${port}`);
});
