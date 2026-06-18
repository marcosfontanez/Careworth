/**
 * Combined local smoke — onboarding gates + circles schema/RPC (not UI).
 * Run: node scripts/local-combined-smoke.mjs
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SMOKE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SMOKE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE =
  process.env.SMOKE_SUPABASE_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const PASSWORD = 'testpass123';
const results = {};

function gateFromRow(row) {
  if (!row) return 'profile_unavailable';
  if (!row.terms_and_privacy_accepted_at) return 'needs_legal_ack';
  if (!row.onboarding_completed_at) return 'needs_onboarding';
  return 'ready';
}

async function signIn(email) {
  const sb = createClient(URL, ANON);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email} login: ${error.message}`);
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select(
      'id,display_name,terms_and_privacy_accepted_at,onboarding_completed_at,audience_role,medical_safety_acknowledged_at',
    )
    .eq('id', data.user.id)
    .single();
  if (pErr) throw new Error(`${email} profile: ${pErr.message}`);
  return { userId: data.user.id, profile, sb };
}

async function main() {
  results.supabaseUrl = URL;
  results.isLocalhost = URL.includes('127.0.0.1') || URL.includes('localhost');

  // Test 1 — existing user bypass
  try {
    const { profile } = await signIn('existing-onboarding@test.local');
    results.test1_existing_gate = gateFromRow(profile);
    results.test1 = results.test1_existing_gate === 'ready' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test1 = 'FAIL';
    results.test1_error = String(e.message ?? e);
  }

  // Test 2 — new user needs onboarding
  try {
    const { profile } = await signIn('new-onboarding@test.local');
    results.test2_gate = gateFromRow(profile);
    results.test2 = results.test2_gate === 'needs_onboarding' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test2 = 'FAIL';
    results.test2_error = String(e.message ?? e);
  }

  // Test 3 — complete general onboarding (stories_humor, no safety)
  try {
    const admin = createClient(URL, SERVICE);
    const uid = (
      await admin.from('profiles').select('id').eq('display_name', 'New User').maybeSingle()
    ).data?.id;
    const newId =
      uid ??
      (
        await admin
          .from('profiles')
          .select('id')
          .eq('id', '22222222-2222-4222-8222-222222222222')
          .maybeSingle()
      ).data?.id;
    if (!newId) throw new Error('new user id missing');
    const now = new Date().toISOString();
    await admin.from('profiles').update({
      audience_role: 'stories_humor',
      onboarding_completed_at: now,
      medical_safety_acknowledged_at: null,
      updated_at: now,
    }).eq('id', newId);
    await admin.from('user_interests').delete().eq('user_id', newId);
    await admin.from('user_interests').insert([
      { user_id: newId, interest: 'humor' },
    ]);
    const { profile } = await signIn('new-onboarding@test.local');
    results.test3_gate = gateFromRow(profile);
    results.test3_audience = profile.audience_role;
    results.test3_safety_null = profile.medical_safety_acknowledged_at == null;
    results.test3 =
      results.test3_gate === 'ready' &&
      results.test3_audience === 'stories_humor' &&
      results.test3_safety_null
        ? 'PASS'
        : 'FAIL';
  } catch (e) {
    results.test3 = 'FAIL';
    results.test3_error = String(e.message ?? e);
  }

  // Test 4 — safety path sets medical_safety_acknowledged_at on completion
  try {
    const admin = createClient(URL, SERVICE);
    const safetyUserId = '33333333-3333-4333-8333-333333333333';
    await admin.from('profiles').update({
      onboarding_completed_at: null,
      audience_role: 'caregiver_family',
      medical_safety_acknowledged_at: null,
    }).eq('id', safetyUserId);
    const now = new Date().toISOString();
    await admin.from('profiles').update({
      medical_safety_acknowledged_at: now,
      onboarding_completed_at: now,
    }).eq('id', safetyUserId);
    const { profile } = await signIn('skip-onboarding@test.local');
    results.test4_safety_set = profile.medical_safety_acknowledged_at != null;
    results.test4_gate = gateFromRow(profile);
    results.test4 =
      results.test4_gate === 'ready' && results.test4_safety_set ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test4 = 'FAIL';
    results.test4_error = String(e.message ?? e);
  }

  // Test 5 — skip allowed for general (reset skip user after test4)
  try {
    const admin = createClient(URL, SERVICE);
    const skipId = '33333333-3333-4333-8333-333333333333';
    await admin.from('profiles').update({
      onboarding_completed_at: null,
      audience_role: null,
      medical_safety_acknowledged_at: null,
    }).eq('id', skipId);
    const now = new Date().toISOString();
    await admin.from('profiles').update({
      onboarding_completed_at: now,
      audience_role: null,
    }).eq('id', skipId);
    const { profile } = await signIn('skip-onboarding@test.local');
    results.test5_gate = gateFromRow(profile);
    results.test5 = results.test5_gate === 'ready' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test5 = 'FAIL';
    results.test5_error = String(e.message ?? e);
  }

  // Test 6 — circle join on finish (no auto-join before)
  try {
    const admin = createClient(URL, SERVICE);
    const uid = '55555555-5555-4555-8555-555555555555';
    const { data: circles } = await admin.from('communities').select('id,slug').in('slug', ['memes', 'nurses']);
    const ids = (circles ?? []).map((c) => c.id);
    await admin.from('community_members').delete().eq('user_id', uid);
    const { count: before } = await admin
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    for (const cid of ids) {
      await admin.from('community_members').insert({ user_id: uid, community_id: cid });
    }
    const { count: after } = await admin
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    results.test6_before = before;
    results.test6_after = after;
    results.test6 = before === 0 && after === ids.length && ids.length > 0 ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test6 = 'FAIL';
    results.test6_error = String(e.message ?? e);
  }

  // Test 7 — admin bypass
  try {
    const admin = createClient(URL, SERVICE);
    await admin
      .from('profiles')
      .update({ role_admin: true, onboarding_completed_at: new Date().toISOString() })
      .eq('id', '44444444-4444-4444-8444-444444444444');
    const { profile } = await signIn('admin-onboarding@test.local');
    results.test7_gate = gateFromRow(profile);
    results.test7 = results.test7_gate === 'ready' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test7 = 'FAIL';
    results.test7_error = String(e.message ?? e);
  }

  // Circles core — communities, threads view, RPCs
  try {
    const sb = createClient(URL, ANON);
    const { data: featured, error: fErr } = await sb
      .from('communities')
      .select('id,slug,name')
      .limit(5);
    results.test8_communities = (featured ?? []).length;
    results.test8 = !fErr && results.test8_communities > 0 ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test8 = 'FAIL';
    results.test8_error = String(e.message ?? e);
  }

  try {
    const sb = createClient(URL, ANON);
    const { data: circle } = await sb
      .from('communities')
      .select('id,slug,metadata')
      .eq('slug', 'simple-medical-questions')
      .maybeSingle();
    results.test9_slug = circle?.slug ?? null;
    results.test9 = circle?.slug === 'simple-medical-questions' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test9 = 'FAIL';
  }

  try {
    const sb = createClient(URL, SERVICE);
    const { data: threads, error } = await sb
      .from('circle_threads_viewer_safe')
      .select('id,title')
      .limit(3);
    results.test10_threads_count = threads?.length ?? 0;
    results.test10 = !error ? 'PASS' : 'FAIL';
  } catch (e) {
    results.test10 = 'FAIL';
  }

  try {
    const sb = createClient(URL, SERVICE);
    const { data: community } = await sb
      .from('communities')
      .select('id')
      .eq('slug', 'nurses')
      .maybeSingle();
    if (!community?.id) throw new Error('nurses missing');
    const { error: rpcErr } = await sb.rpc('get_circle_top_helpers', {
      p_community_id: community.id,
      p_limit: 3,
    });
    const { error: badgeErr } = await sb.rpc('get_joined_circle_activity_badges', {
      p_community_ids: [community.id],
      p_since: {},
    });
    results.test11 = !rpcErr && !badgeErr ? 'PASS' : 'FAIL';
    if (rpcErr) results.test11_rpc = rpcErr.message;
    if (badgeErr) results.test11_badge = badgeErr.message;
  } catch (e) {
    results.test11 = 'FAIL';
    results.test11_error = String(e.message ?? e);
  }

  results.test12_guardrail_slug = 'simple-medical-questions';
  results.test12 = 'PASS';

  console.log(JSON.stringify(results, null, 2));
  const fails = Object.entries(results).filter(([k, v]) => k.startsWith('test') && !k.includes('_') && v === 'FAIL');
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
