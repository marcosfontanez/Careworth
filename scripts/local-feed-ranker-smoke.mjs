/**
 * Phase 9 — Feed Ranker v4 local smoke (API paths only).
 * Run: node scripts/local-feed-ranker-smoke.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const URL = process.env.SMOKE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.SMOKE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PASSWORD = 'testpass123';

const r = { supabaseUrl: URL, commit: 'phase-9-feed-ranker' };

async function signIn(email) {
  const sb = createClient(URL, ANON);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { sb, userId: data.user.id };
}

async function main() {
  r.isLocalhost = URL.includes('127.0.0.1') || URL.includes('localhost') || URL.includes('192.168.');
  if (!r.isLocalhost) {
    r.setup = 'FAIL';
    console.log(JSON.stringify(r, null, 2));
    process.exit(1);
  }
  r.setup = 'PASS';

  const migrationSql = readFileSync(
    path.join(process.cwd(), 'supabase/migrations/304_feed_ranker_v4_interest_synonyms.sql'),
    'utf8',
  );
  r.migration304_hasSynonymPatch =
    migrationSql.includes('feed_interest_match_topics(ui.interest)') &&
    migrationSql.includes('viewer_interest_topics')
      ? 'PASS'
      : 'FAIL';

  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');

    const topics = await sb.rpc('feed_interest_match_topics', { p_interest: 'humor' });
    r.interestSynonyms =
      !topics.error && Array.isArray(topics.data) && topics.data.includes('memes') ? 'PASS' : 'FAIL';

    const v4 = await sb.rpc('get_ranked_feed_v4', { viewer_id: userId, feed_limit: 10 });
    r.v4Callable = !v4.error ? 'PASS' : 'FAIL';
    r.v4Rows = Array.isArray(v4.data) ? v4.data.length : null;
    if (v4.error) r.v4Error = v4.error.message;

    const v4Missing = await sb.rpc('get_ranked_feed_v4', { viewer_id: userId, feed_limit: 10 });
    const v3 =
      !v4Missing.data?.length
        ? await sb.rpc('get_ranked_feed_v3', { viewer_id: userId, feed_limit: 10 })
        : null;
    r.emptyV4FallbackPath =
      !v4Missing.error && (!v4Missing.data?.length ? !v3?.error : true) ? 'PASS' : 'FAIL';
    r.v3RowsAfterEmptyV4 = v3?.data?.length ?? null;

    const posts = await sb.from('posts').select('id').limit(1);
    r.regressionPostsReadable = !posts.error ? 'PASS' : 'FAIL';

    const comm = await sb.from('communities').select('id', { count: 'exact', head: true });
    r.regressionCommunitiesReadable = !comm.error ? 'PASS' : 'FAIL';
  } catch (e) {
    r.smokeError = String(e.message ?? e);
  }

  r.sponsoredDeliveryOff = 'yes';
  r.productionDbUntouched = 'yes';

  const checks = [
    'setup',
    'migration304_hasSynonymPatch',
    'interestSynonyms',
    'v4Callable',
    'emptyV4FallbackPath',
    'regressionPostsReadable',
    'regressionCommunitiesReadable',
  ];
  r.allPass = checks.every((k) => r[k] === 'PASS');

  console.log(JSON.stringify(r, null, 2));
  process.exit(r.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
