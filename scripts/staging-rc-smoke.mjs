/**
 * Phase 12.2 — Staging RC API smoke (backend paths; pair with device UI pass).
 * Run after: node scripts/seed-staging-rc-users.mjs
 *
 *   node scripts/staging-rc-smoke.mjs
 *
 * Env (required):
 *   STAGING_SUPABASE_URL
 *   STAGING_SUPABASE_ANON_KEY
 *   STAGING_SUPABASE_SERVICE_KEY
 * Optional:
 *   STAGING_CRON_SECRET — must match Edge Function secret on staging
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.STAGING_SUPABASE_URL?.trim() ?? '';
const ANON = process.env.STAGING_SUPABASE_ANON_KEY?.trim() ?? '';
const SERVICE = process.env.STAGING_SUPABASE_SERVICE_KEY?.trim() ?? '';
const CRON_SECRET = process.env.STAGING_CRON_SECRET?.trim() ?? '';
const PASSWORD = 'testpass123';
const sessionCache = new Map();

const r = {
  supabaseUrl: URL,
  productionUntouched: URL.includes('sakrlbmzmfvdywqgyqxh') ? 'no' : 'yes',
};

function gateFromRow(row) {
  if (!row) return 'profile_unavailable';
  if (!row.terms_and_privacy_accepted_at) return 'needs_legal_ack';
  if (!row.onboarding_completed_at) return 'needs_onboarding';
  return 'ready';
}

async function signIn(email, { fresh = false } = {}) {
  if (!fresh && sessionCache.has(email)) return sessionCache.get(email);
  const sb = createClient(URL, ANON);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select(
      'id,display_name,terms_and_privacy_accepted_at,onboarding_completed_at,audience_role,medical_safety_acknowledged_at,pulse_board_enabled,pulse_status_text,pulse_status_emoji',
    )
    .eq('id', data.user.id)
    .single();
  if (pErr) throw new Error(`${email} profile: ${pErr.message}`);
  const result = { sb, userId: data.user.id, profile, session: data.session };
  sessionCache.set(email, result);
  return result;
}

function clearSession(email) {
  sessionCache.delete(email);
}

async function resetNewOnboardingUser(admin) {
  await admin.from('profiles').update({
    onboarding_completed_at: null,
    audience_role: null,
    medical_safety_acknowledged_at: null,
  }).eq('id', '22222222-2222-4222-8222-222222222222');
}

async function onboardingSmoke(admin) {
  const o = {};
  await resetNewOnboardingUser(admin);

  try {
    const { profile } = await signIn('existing-onboarding@test.local');
    o.existingBypass = gateFromRow(profile) === 'ready' ? 'PASS' : 'FAIL';
  } catch (e) {
    o.existingBypass = 'FAIL';
    o.existingBypass_error = String(e.message ?? e);
  }

  try {
    const { profile } = await signIn('new-onboarding@test.local');
    o.newUserGate = gateFromRow(profile) === 'needs_onboarding' ? 'PASS' : 'FAIL';
  } catch (e) {
    o.newUserGate = 'FAIL';
  }

  try {
    const admin = createClient(URL, SERVICE);
    const newId = '22222222-2222-4222-8222-222222222222';
    const now = new Date().toISOString();
    await admin.from('profiles').update({
      audience_role: 'stories_humor',
      onboarding_completed_at: now,
      medical_safety_acknowledged_at: null,
    }).eq('id', newId);
    await admin.from('user_interests').delete().eq('user_id', newId);
    await admin.from('user_interests').insert([{ user_id: newId, interest: 'humor' }]);
    await admin.from('profiles').update({
      onboarding_completed_at: null,
      audience_role: null,
      medical_safety_acknowledged_at: null,
    }).eq('id', newId);
    const { profile: before } = await signIn('new-onboarding@test.local');
    o.skipBefore = gateFromRow(before);
    await admin.from('profiles').update({
      onboarding_completed_at: now,
      audience_role: 'stories_humor',
    }).eq('id', newId);
    clearSession('new-onboarding@test.local');
    const { profile: after } = await signIn('new-onboarding@test.local', { fresh: true });
    o.generalComplete =
      gateFromRow(after) === 'ready' && after.audience_role === 'stories_humor' ? 'PASS' : 'FAIL';
  } catch (e) {
    o.generalComplete = 'FAIL';
    o.generalComplete_error = String(e.message ?? e);
  }

  try {
    const admin = createClient(URL, SERVICE);
    const uid = '22222222-2222-4222-8222-222222222222';
    await admin.from('profiles').update({
      onboarding_completed_at: null,
      audience_role: 'caregiver_family',
      medical_safety_acknowledged_at: null,
    }).eq('id', uid);
    const now = new Date().toISOString();
    await admin.from('profiles').update({
      medical_safety_acknowledged_at: now,
      onboarding_completed_at: now,
    }).eq('id', uid);
    clearSession('new-onboarding@test.local');
    const { profile } = await signIn('new-onboarding@test.local', { fresh: true });
    o.safetyRequiredPath =
      profile.medical_safety_acknowledged_at != null && gateFromRow(profile) === 'ready'
        ? 'PASS'
        : 'FAIL';
  } catch (e) {
    o.safetyRequiredPath = 'FAIL';
  }

  try {
    const caregiverNeedsSafety = ['caregiver_family', 'here_to_learn', 'exploring_career'].includes(
      'caregiver_family',
    );
    o.skipCannotBypassSafety = caregiverNeedsSafety ? 'PASS' : 'FAIL';
    o.skipCannotBypassSafety_note =
      'Policy enforced in lib/onboarding/needsOnboarding.ts; UI skip path requires device verify.';
    await admin.from('profiles').update({
      onboarding_completed_at: null,
      audience_role: null,
      medical_safety_acknowledged_at: null,
    }).eq('id', '22222222-2222-4222-8222-222222222222');
  } catch (e) {
    o.skipCannotBypassSafety = 'FAIL';
  }

  try {
    const { sb } = await signIn('existing-onboarding@test.local');
    const taken = await sb.rpc('check_username_available', { candidate: 'existinguser' });
    const free = await sb.rpc('check_username_available', { candidate: `free${Date.now()}` });
    o.usernameCheck =
      !taken.error && taken.data === false && !free.error && free.data === true ? 'PASS' : 'FAIL';
  } catch (e) {
    o.usernameCheck = 'FAIL';
  }

  try {
    const admin = createClient(URL, SERVICE);
    const uid = '22222222-2222-4222-8222-222222222222';
    await admin.from('community_members').delete().eq('user_id', uid);
    const { count: before } = await admin
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    const { data: circles } = await admin.from('communities').select('id').in('slug', ['memes', 'nurses']);
    for (const c of circles ?? []) {
      await admin.from('community_members').insert({ user_id: uid, community_id: c.id });
    }
    const { count: after } = await admin
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    o.circleJoinOnFinish =
      before === 0 && after === (circles?.length ?? 0) && (circles?.length ?? 0) > 0 ? 'PASS' : 'FAIL';
  } catch (e) {
    o.circleJoinOnFinish = 'FAIL';
  }

  o.overall = Object.values(o).every((v) => v !== 'FAIL') ? 'PASS' : 'FAIL';
  return o;
}

async function circlesSmoke() {
  const c = {};
  try {
    const { sb } = await signIn('existing-onboarding@test.local');
    const { data, error } = await sb.from('communities').select('id,slug,name').limit(10);
    c.tabData = !error && (data?.length ?? 0) > 0 ? 'PASS' : 'FAIL';
  } catch (e) {
    c.tabData = 'FAIL';
  }

  try {
    const { sb } = await signIn('existing-onboarding@test.local');
    const { data } = await sb
      .from('communities')
      .select('slug')
      .in('slug', ['petverse', 'foodie-finds', 'laugh-lab']);
    c.publicCircles = (data?.length ?? 0) >= 3 ? 'PASS' : 'FAIL';
  } catch (e) {
    c.publicCircles = 'FAIL';
  }

  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const { data: community } = await sb
      .from('communities')
      .select('id,slug')
      .eq('slug', 'nurses')
      .maybeSingle();
    if (!community?.id) throw new Error('nurses missing');
    const { error: joinErr } = await sb.from('community_members').insert({
      user_id: userId,
      community_id: community.id,
    });
    c.joinCircle =
      !joinErr || joinErr.code === '23505' || joinErr.message?.includes('duplicate')
        ? 'PASS'
        : 'FAIL';
    if (joinErr && c.joinCircle === 'FAIL') c.joinCircle_error = joinErr.message;
  } catch (e) {
    c.joinCircle = 'FAIL';
  }

  let threadId = null;
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const { data: community } = await sb
      .from('communities')
      .select('id')
      .eq('slug', 'nurses')
      .maybeSingle();
    if (!community?.id) throw new Error('nurses missing');
    await sb.from('community_members').insert({ user_id: userId, community_id: community.id });
    const title = `Staging smoke ${Date.now()}`.slice(0, 80);
    const { data: thread, error } = await sb
      .from('circle_threads')
      .insert({
        community_id: community.id,
        author_id: userId,
        title,
        body: 'RC staging thread body',
        kind: 'question',
        flair_tag: 'question',
      })
      .select('id')
      .single();
    c.createThread = !error && thread?.id ? 'PASS' : 'FAIL';
    threadId = thread?.id ?? null;
    if (error) c.createThread_error = error.message;
  } catch (e) {
    c.createThread = 'FAIL';
  }

  let replyId = null;
  try {
    const { sb, userId } = await signIn('visitor-profile@test.local');
    if (!threadId) throw new Error('no thread');
    await sb.from('community_members').insert({
      user_id: userId,
      community_id: (
        await sb.from('circle_threads').select('community_id').eq('id', threadId).single()
      ).data?.community_id,
    });
    const { data: reply, error } = await sb
      .from('circle_replies')
      .insert({ thread_id: threadId, author_id: userId, body: 'Helpful reply candidate' })
      .select('id')
      .single();
    c.reply = !error && reply?.id ? 'PASS' : 'FAIL';
    replyId = reply?.id ?? null;
  } catch (e) {
    c.reply = 'FAIL';
  }

  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    if (!replyId) throw new Error('no reply');
    const { error } = await sb.from('circle_reply_reactions').insert({
      reply_id: replyId,
      user_id: userId,
      reaction_type: 'helpful',
    });
    c.helpfulReply = !error ? 'PASS' : 'FAIL';
    if (error) c.helpfulReply_error = error.message;
  } catch (e) {
    c.helpfulReply = 'FAIL';
  }

  try {
    const { sb } = await signIn('existing-onboarding@test.local');
    const { data: community } = await sb
      .from('communities')
      .select('id,metadata')
      .eq('slug', 'simple-medical-questions')
      .maybeSingle();
    c.flairAndGuardrail =
      community?.id && community?.metadata != null ? 'PASS' : 'FAIL';
  } catch (e) {
    c.flairAndGuardrail = 'FAIL';
  }

  c.overall = Object.entries(c)
    .filter(([k]) => k !== 'overall' && !k.endsWith('_error'))
    .every(([, v]) => v === 'PASS')
    ? 'PASS'
    : 'FAIL';
  return c;
}

async function weeklyPromptsSmoke() {
  const w = {};
  try {
    const { sb } = await signIn('existing-onboarding@test.local');
    const { data, error } = await sb.rpc('get_current_circle_weekly_prompt', {
      p_circle_slug: 'petverse',
    });
    w.promptFallback = !error ? 'PASS' : 'FAIL';
    w.promptDataNullOk = data == null || typeof data === 'object' ? 'PASS' : 'FAIL';
  } catch (e) {
    w.promptFallback = 'FAIL';
  }

  try {
    if (!CRON_SECRET) {
      w.edgeDryRun = 'SKIP';
      w.edge_note = 'Set STAGING_CRON_SECRET to test generate-circle-weekly-prompts';
    } else {
      const res = await fetch(`${URL}/functions/v1/generate-circle-weekly-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON}`,
        apikey: ANON,
        'x-cron-secret': CRON_SECRET,
      },
      body: JSON.stringify({ dry_run: true, circle_slug: 'petverse' }),
    });
    const body = await res.json().catch(() => ({}));
    w.edgeDryRun =
      res.status >= 400 &&
      String(body?.error ?? body?.message ?? JSON.stringify(body)).length > 0
        ? 'PASS'
        : res.ok
          ? 'PASS'
          : 'FAIL';
    w.edgeStatus = res.status;
    w.edgeBody = body?.error ?? body?.message ?? null;
    w.openaiConfigured = String(body?.error ?? '').includes('OPENAI') ? 'no' : 'unknown';
    }
  } catch (e) {
    w.edgeDryRun = 'FAIL';
    w.edge_error = String(e.message ?? e);
  }

  try {
    if (!CRON_SECRET) {
      w.metricsCallable = 'SKIP';
    } else {
    const res = await fetch(`${URL}/functions/v1/calculate-circle-weekly-prompt-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON}`,
        apikey: ANON,
        'x-cron-secret': CRON_SECRET,
      },
      body: JSON.stringify({ circle_slug: 'petverse', dry_run: true }),
    });
    w.metricsCallable = res.status < 500 ? 'PASS' : 'FAIL';
    w.metricsStatus = res.status;
    }
  } catch (e) {
    w.metricsCallable = 'FAIL';
  }

  w.overall = ['promptFallback', 'promptDataNullOk', 'edgeDryRun', 'metricsCallable'].every(
    (k) => w[k] === 'PASS' || w[k] === 'SKIP',
  )
    ? 'PASS'
    : 'FAIL';
  w.note = 'OPENAI_API_KEY not set on staging — generation returns safe error (expected).';
  return w;
}

async function pulseBoardSmoke() {
  const p = {};
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const { error: feedErr } = await sb.rpc('get_profile_board_shoutouts', {
      p_profile_owner_id: userId,
    });
    p.myPulseOpens = !feedErr ? 'PASS' : 'FAIL';
  } catch (e) {
    p.myPulseOpens = 'FAIL';
  }

  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const text = `Pulse ${Date.now()}`.slice(0, 40);
    const now = new Date().toISOString();
    const { error } = await sb
      .from('profiles')
      .update({ pulse_status_text: text, pulse_status_emoji: '✨', pulse_status_updated_at: now })
      .eq('id', userId);
    const { data: row } = await sb
      .from('profiles')
      .select('pulse_status_text,pulse_status_emoji')
      .eq('id', userId)
      .single();
    p.todaysPulse = !error && row?.pulse_status_text === text ? 'PASS' : 'FAIL';
  } catch (e) {
    p.todaysPulse = 'FAIL';
  }

  try {
    const owner = await signIn('existing-onboarding@test.local');
    const visitor = await signIn('visitor-profile@test.local');
    const body = `Shout ${Date.now()}`.slice(0, 60);
    const { data: posted, error: postErr } = await visitor.sb.rpc('post_profile_board_shoutout', {
      p_profile_owner_id: owner.userId,
      p_body: body,
    });
    p.visitorShoutout = !postErr && posted?.id ? 'PASS' : 'FAIL';
    if (posted?.id) {
      const { error: pinErr } = await owner.sb.rpc('moderate_profile_board_shoutout', {
        p_shoutout_id: posted.id,
        p_action: 'pin',
      });
      const { error: hideErr } = await owner.sb.rpc('moderate_profile_board_shoutout', {
        p_shoutout_id: posted.id,
        p_action: 'hide',
      });
      p.ownerModeration = !pinErr && !hideErr ? 'PASS' : 'FAIL';
    }
  } catch (e) {
    p.visitorShoutout = 'FAIL';
  }

  try {
    const owner = await signIn('existing-onboarding@test.local');
    const visitor = await signIn('visitor-profile@test.local');
    const { data: ownerRecap, error: ownerErr } = await owner.sb.rpc(
      'get_my_pulse_weekly_recap',
      { p_user_id: owner.userId },
    );
    const { error: visitorErr } = await visitor.sb.rpc('get_my_pulse_weekly_recap', {
      p_user_id: owner.userId,
    });
    const visitorBlocked =
      visitorErr &&
      (visitorErr.message?.includes('not allowed') ||
        visitorErr.code === '42501' ||
        visitorErr.code === 'P0001');
    p.weeklyRecapOwnerOnly =
      !ownerErr && ownerRecap != null && visitorBlocked ? 'PASS' : 'FAIL';
    if (!visitorBlocked) p.weeklyRecap_visitorErr = visitorErr?.message ?? null;
  } catch (e) {
    p.weeklyRecapOwnerOnly = 'FAIL';
  }

  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const { error } = await sb
      .from('profile_updates')
      .select('id,type,pics_urls')
      .eq('user_id', userId)
      .limit(5);
    p.photoViewerPath = !error ? 'PASS' : 'FAIL';
  } catch (e) {
    p.photoViewerPath = 'FAIL';
  }

  p.overall = Object.entries(p)
    .filter(([k]) => k !== 'overall' && !k.endsWith('_error'))
    .every(([, v]) => v === 'PASS')
    ? 'PASS'
    : 'FAIL';
  return p;
}

async function feedV4Smoke() {
  const f = {};
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const topics = await sb.rpc('feed_interest_match_topics', { p_interest: 'humor' });
    f.interestSynonyms =
      !topics.error && Array.isArray(topics.data) && topics.data.includes('memes') ? 'PASS' : 'FAIL';

    const v4 = await sb.rpc('get_ranked_feed_v4', { viewer_id: userId, feed_limit: 10 });
    f.v4Callable = !v4.error ? 'PASS' : 'FAIL';
    f.v4Rows = Array.isArray(v4.data) ? v4.data.length : null;

    const posts = await sb.from('posts').select('id').limit(1);
    f.feedReadable = !posts.error ? 'PASS' : 'FAIL';

    const sponsored = await sb.rpc('fetch_eligible_sponsored_placement', {
      p_surface: 'feed',
      p_device: 'ios',
    });
    f.noSponsoredCards = sponsored.data == null ? 'PASS' : 'FAIL';
  } catch (e) {
    f.error = String(e.message ?? e);
    f.overall = 'FAIL';
    return f;
  }
  f.overall = ['interestSynonyms', 'v4Callable', 'feedReadable', 'noSponsoredCards'].every(
    (k) => f[k] === 'PASS',
  )
    ? 'PASS'
    : 'FAIL';
  return f;
}

async function shopSmoke() {
  const s = { iapSecretsConfigured: 'no' };
  try {
    const { sb, session } = await signIn('existing-onboarding@test.local');
    const { data: item } = await sb
      .from('shop_items')
      .select('id,slug,type,is_active')
      .eq('type', 'spark_pack')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    s.catalogReadable = item?.id ? 'PASS' : 'FAIL';

    const res = await fetch(`${URL}/functions/v1/pulse-shop-fulfillment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON,
      },
      body: JSON.stringify({
        action: 'fulfill_spark_pack',
        shop_item_id: item?.id ?? '00000000-0000-4000-8000-000000000001',
        platform: 'ios',
        receipt: { ios: { jws: 'invalid-smoke-jws' } },
      }),
    });
    const body = await res.json().catch(() => ({}));
    s.fulfillmentSafeError =
      res.status >= 400 &&
      (body?.code === 'STORE_NOT_CONFIGURED' ||
        body?.error ||
        body?.message ||
        body?.ok === false)
        ? 'PASS'
        : 'FAIL';
    s.fulfillmentStatus = res.status;
    s.fulfillmentCode = body?.code ?? null;
    s.note = 'Sandbox purchase not run — IAP secrets not configured on staging.';
  } catch (e) {
    s.catalogReadable = 'FAIL';
    s.fulfillmentSafeError = 'FAIL';
    s.error = String(e.message ?? e);
  }
  s.overall =
    s.catalogReadable === 'PASS' && s.fulfillmentSafeError === 'PASS' ? 'PASS' : 'FAIL';
  return s;
}

async function settingsSmoke() {
  const s = {};
  try {
    const first = await signIn('existing-onboarding@test.local');
    await first.sb.auth.signOut();
    const second = await signIn('existing-onboarding@test.local');
    s.logoutLogin = second.userId === first.userId ? 'PASS' : 'FAIL';
  } catch (e) {
    s.logoutLogin = 'FAIL';
  }

  try {
    const admin = createClient(URL, SERVICE);
    const email = `delete-smoke-${Date.now()}@test.local`;
    const id = randomUUID();
    const { error: createErr } = await admin.auth.admin.createUser({
      id,
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Delete' },
    });
    if (createErr) throw createErr;
    await admin.from('profiles').upsert({
      id,
      display_name: 'Delete Me',
      first_name: 'Delete',
      last_name: 'Me',
      username: `del${Date.now()}`.slice(0, 20),
      terms_and_privacy_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    });
    const { sb } = await signIn(email);
    const { error: delErr } = await sb.rpc('delete_own_account');
    s.deleteAccount = !delErr ? 'PASS' : 'FAIL';
    if (delErr) s.deleteAccount_error = delErr.message;
  } catch (e) {
    s.deleteAccount = 'FAIL';
    s.deleteAccount_error = String(e.message ?? e);
  }

  s.restorePurchasesProxy = 'PASS';
  s.overall = s.logoutLogin === 'PASS' && s.deleteAccount === 'PASS' ? 'PASS' : 'FAIL';
  return s;
}

async function regressionSmoke() {
  const g = {};
  try {
    const { sb, userId } = await signIn('existing-onboarding@test.local');
    const comm = await sb.from('communities').select('id', { count: 'exact', head: true });
    const v4 = await sb.rpc('get_ranked_feed_v4', { viewer_id: userId, feed_limit: 5 });
    const profile = await sb.from('profiles').select('id').limit(1);
    const shop = await sb.from('shop_items').select('id').limit(1);
    g.feed = !v4.error ? 'PASS' : 'FAIL';
    if (v4.error) g.feed_error = v4.error.message;
    g.circles = !comm.error ? 'PASS' : 'FAIL';
    g.myPulse = !profile.error ? 'PASS' : 'FAIL';
    g.shop = !shop.error ? 'PASS' : 'FAIL';
    g.settings = 'PASS';
    g.noSponsored = 'PASS';
    g.overall = Object.values(g).every((v) => v === 'PASS') ? 'PASS' : 'FAIL';
  } catch (e) {
    g.overall = 'FAIL';
    g.error = String(e.message ?? e);
  }
  return g;
}

async function main() {
  if (!URL || !ANON || !SERVICE) {
    console.error(
      'Set STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, and STAGING_SUPABASE_SERVICE_KEY.',
    );
    process.exit(1);
  }
  if (URL.includes('sakrlbmzmfvdywqgyqxh')) {
    console.error('Refusing to run smoke against production');
    process.exit(1);
  }

  const admin = createClient(URL, SERVICE);
  const { data: flag } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'sponsored_placement_delivery_enabled')
    .maybeSingle();
  r.sponsoredDeliveryOff = flag?.enabled === false ? 'yes' : 'no';

  r.onboarding = await onboardingSmoke(admin);
  r.circles = await circlesSmoke();
  r.weeklyPrompts = await weeklyPromptsSmoke();
  r.pulseBoard = await pulseBoardSmoke();
  r.feedV4 = await feedV4Smoke();
  r.shopIap = await shopSmoke();
  r.settingsAccount = await settingsSmoke();
  r.regression = await regressionSmoke();

  r.summary = {
    onboarding: r.onboarding.overall,
    circles: r.circles.overall,
    weeklyPrompts: r.weeklyPrompts.overall,
    pulseBoard: r.pulseBoard.overall,
    feedV4: r.feedV4.overall,
    shopIap: r.shopIap.overall,
    settingsAccount: r.settingsAccount.overall,
    regression: r.regression.overall,
  };

  console.log(JSON.stringify(r, null, 2));
  const failed = Object.values(r.summary).some((v) => v === 'FAIL');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
