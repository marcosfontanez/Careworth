import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';

export async function uploadExportMp4(localPath: string, storagePath: string): Promise<string> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const buf = await fs.readFile(localPath);
  const { error: upErr } = await supabase.storage.from('exports').upload(storagePath, buf, {
    contentType: 'video/mp4',
    upsert: true,
  });
  if (upErr) {
    throw new Error(upErr.message);
  }
  const ttl = Number(process.env.EXPORT_SIGNED_URL_SECS ?? 3600);
  const { data, error: signErr } = await supabase.storage.from('exports').createSignedUrl(storagePath, ttl);
  if (signErr || !data?.signedUrl) {
    throw new Error(signErr?.message ?? 'Could not sign export URL');
  }
  return data.signedUrl;
}
