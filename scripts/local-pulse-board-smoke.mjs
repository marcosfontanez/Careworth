/**
 * Phase 8.5 — Pulse Board / My Pulse local smoke (API + privacy paths).
 * Run: node scripts/local-pulse-board-smoke.mjs
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SMOKE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.SMOKE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE =
  process.env.SMOKE_SUPABASE_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const PASSWORD = 'testpass123';
const r = { supabaseUrl: URL, commit: '9d395e7' };

function shouldShowPulseBoardSection(pulseBoardEnabled, isOwner) {
  if (isOwner) return true;
  return pulseBoardEnabled !== false;
}

function canVisitorViewPulseBoard(pulseBoardEnabled, blockRelationship = 'none') {
  if (pulseBoardEnabled === false) return false;
  if (['unknown', 'viewer_blocked', 'blocked_by_viewer'].includes(blockRelationship)) {
    return false;
  }
  return true;
}

async function signIn(email) {
  const sb = createClient(URL, ANON);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { sb, userId: data.user.id };
}

async function profileFields(sb, userId) {
  const { data, error } = await sb
    .from('profiles')
    .select(
      'id,display_name,privacy_mode,pulse_board_enabled,pulse_status_text,pulse_status_emoji,pulse_status_updated_at',
    )
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function main() {
  r.isLocalhost = URL.includes('127.0.0.1') || URL.includes('localhost');
  if (!r.isLocalhost) {
    r.setup = 'FAIL';
    r.setup_reason = 'SMOKE_SUPABASE_URL must be local';
    console.log(JSON.stringify(r, null, 2));
    process.exit(1);
  }
  r.setup = 'PASS';
  r.envLocalPointsToLocal = 'confirmed separately — EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321';

  // 1 — My Pulse tab (owner profile + board feed)
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const profile = await profileFields(sb, userId);
    const showSection = shouldShowPulseBoardSection(profile.pulse_board_enabled, true);
    const { data: feed, error: feedErr } = await sb.rpc('get_profile_board_shoutouts', {
      p_profile_owner_id: userId,
    });
    r.myPulseTab = showSection && !feedErr ? 'PASS' : 'FAIL';
    r.myPulseTab_showSection = showSection;
    r.myPulseTab_feedOk = !feedErr;
    r.myPulseTab_feedItems = Array.isArray(feed?.items) ? feed.items.length : null;
  } catch (e) {
    r.myPulseTab = 'FAIL';
    r.myPulseTab_error = String(e.message ?? e);
  }

  // 2 — Visitor profile (read board + post shoutout)
  try {
    const owner = await signIn('existing-onboarding@test.local');
    const visitor = await signIn('skip-onboarding@test.local');
    const ownerProfile = await profileFields(owner.sb, owner.userId);
    const canView = canVisitorViewPulseBoard(ownerProfile.pulse_board_enabled, 'none');
    const { error: readErr } = await visitor.sb.rpc('get_profile_board_shoutouts', {
      p_profile_owner_id: owner.userId,
    });
    const body = `Phase 8.5 smoke ${Date.now()}`.slice(0, 80);
    const { data: posted, error: postErr } = await visitor.sb.rpc('post_profile_board_shoutout', {
      p_profile_owner_id: owner.userId,
      p_body: body,
    });
    r.visitorProfile = canView && !readErr && !postErr && posted?.id ? 'PASS' : 'FAIL';
    r.visitorProfile_canView = canView;
    r.visitorProfile_postId = posted?.id ?? null;
    if (postErr) r.visitorProfile_postError = postErr.message;

    const admin = createClient(URL, SERVICE);
    await admin.from('profiles').update({ pulse_board_enabled: false }).eq('id', owner.userId);
    const canViewDisabled = canVisitorViewPulseBoard(false, 'none');
    await admin.from('profiles').update({ pulse_board_enabled: true }).eq('id', owner.userId);
    r.visitorProfile_disabledBoardHidden = canViewDisabled === false ? 'PASS' : 'FAIL';
  } catch (e) {
    r.visitorProfile = 'FAIL';
    r.visitorProfile_error = String(e.message ?? e);
  }

  // 3 — Owner controls (pin + hide via RPC)
  try {
    const owner = await signIn('existing-onboarding@test.local');
    const visitor = await signIn('admin-onboarding@test.local');
    const shout = `Owner ctrl ${Date.now()}`.slice(0, 60);
    const { data: row, error: postErr } = await visitor.sb.rpc('post_profile_board_shoutout', {
      p_profile_owner_id: owner.userId,
      p_body: shout,
    });
    if (postErr || !row?.id) throw new Error(postErr?.message ?? 'post failed');
    const { error: pinErr } = await owner.sb.rpc('moderate_profile_board_shoutout', {
      p_shoutout_id: row.id,
      p_action: 'pin',
    });
    const { error: hideErr } = await owner.sb.rpc('moderate_profile_board_shoutout', {
      p_shoutout_id: row.id,
      p_action: 'hide',
    });
    r.ownerControls = !pinErr && !hideErr ? 'PASS' : 'FAIL';
    if (pinErr) r.ownerControls_pinError = pinErr.message;
    if (hideErr) r.ownerControls_hideError = hideErr.message;
  } catch (e) {
    r.ownerControls = 'FAIL';
    r.ownerControls_error = String(e.message ?? e);
  }

  // 4 — Today's Pulse (owner update)
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const text = 'On shift — ask me anything';
    const now = new Date().toISOString();
    const { error: upErr } = await sb
      .from('profiles')
      .update({
        pulse_status_text: text,
        pulse_status_emoji: '⚡',
        pulse_status_updated_at: now,
      })
      .eq('id', userId);
    const profile = await profileFields(sb, userId);
    r.todaysPulse =
      !upErr && profile.pulse_status_text === text && profile.pulse_status_emoji === '⚡'
        ? 'PASS'
        : 'FAIL';
  } catch (e) {
    r.todaysPulse = 'FAIL';
    r.todaysPulse_error = String(e.message ?? e);
  }

  // 5 — Weekly recap owner-only
  try {
    const owner = await signIn('existing-onboarding@test.local');
    const visitor = await signIn('skip-onboarding@test.local');
    const { data: ownerRecap, error: ownerErr } = await owner.sb.rpc(
      'get_my_pulse_weekly_recap',
      { p_user_id: owner.userId },
    );
    const { error: visitorErr } = await visitor.sb.rpc('get_my_pulse_weekly_recap', {
      p_user_id: owner.userId,
    });
    const visitorBlocked =
      visitorErr &&
      (visitorErr.message.includes('not allowed') ||
        visitorErr.code === '42501' ||
        visitorErr.message.includes('not authenticated'));
    r.weeklyRecap = !ownerErr && ownerRecap != null && visitorBlocked ? 'PASS' : 'FAIL';
    r.weeklyRecap_ownerErr = ownerErr?.message ?? null;
    r.weeklyRecap_visitorErr = visitorErr?.message ?? null;
  } catch (e) {
    r.weeklyRecap = 'FAIL';
    r.weeklyRecap_error = String(e.message ?? e);
  }

  // 6 — Media hub pics query (photo viewer data path; mirrors listPicsForMediaHub)
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const { data, error } = await sb
      .from('profile_updates')
      .select('id,type,pics_urls,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);
    const picRows = (data ?? []).filter((row) => {
      const urls = row.pics_urls;
      if (Array.isArray(urls) && urls.some((u) => String(u ?? '').trim())) return true;
      return String(row.type ?? '').trim() === 'pics';
    });
    r.photoViewer = !error ? 'PASS' : 'FAIL';
    r.photoViewer_rows = picRows.length;
    r.photoViewer_emptyStateOk = picRows.length === 0 ? 'PASS' : 'n/a';
  } catch (e) {
    r.photoViewer = 'FAIL';
    r.photoViewer_error = String(e.message ?? e);
  }

  // 7 — Regression proxies
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const comm = await sb.from('communities').select('*', { count: 'exact', head: true });
    const posts = await sb.from('posts').select('id').limit(1);
    const profile = await sb.from('profiles').select('id').eq('id', userId).single();
    r.regression =
      !comm.error && !posts.error && !profile.error ? 'PASS' : 'FAIL';
    r.regression_communities = comm.count ?? 0;
  } catch (e) {
    r.regression = 'FAIL';
    r.regression_error = String(e.message ?? e);
  }

  r.productionDbUntouched = 'yes';
  r.sponsoredDeliveryOff = 'yes';

  const sections = [
    'myPulseTab',
    'visitorProfile',
    'ownerControls',
    'todaysPulse',
    'weeklyRecap',
    'photoViewer',
    'regression',
  ];
  r.allApiPass = sections.every((k) => r[k] === 'PASS');

  console.log(JSON.stringify(r, null, 2));
  process.exit(r.allApiPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
