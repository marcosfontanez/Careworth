#!/usr/bin/env node
/**
 * Minimal poll loop for `public.creator_media_jobs`.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API).
 *
 * Default: process one queued job, mark running → failed with a clear message (stub).
 * Implement processing per `kind` with ffmpeg / ML when ready.
 *
 * Usage:
 *   node scripts/creator-media-worker.mjs              # one tick
 *   node scripts/creator-media-worker.mjs --watch      # poll every 5s
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const watch = process.argv.includes('--watch');

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

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

  const guidance =
    `Stub worker: implement processing for kind "${job.kind}". ` +
    `Use job.input (storage paths, trim ranges) with ffmpeg, then write output and update output jsonb.`;

  await supabase
    .from('creator_media_jobs')
    .update({
      status: 'failed',
      error: guidance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  console.log('[worker] processed (stub fail)', job.id, job.kind);
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
