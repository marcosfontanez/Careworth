/**
 * Seed RC staging test users (non-PHI, disposable emails only).
 * Run linked to staging:
 *   node scripts/seed-staging-rc-users.mjs
 *
 * Env (required):
 *   STAGING_SUPABASE_URL          — e.g. https://YOUR_STAGING_REF.supabase.co
 *   STAGING_SUPABASE_SERVICE_KEY  — Dashboard → Settings → API → service_role (never commit)
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.STAGING_SUPABASE_URL?.trim() ?? '';
const SERVICE = process.env.STAGING_SUPABASE_SERVICE_KEY?.trim() ?? '';

const PASSWORD = 'testpass123';
const now = new Date().toISOString();

/** @type {Array<{ id: string; email: string; firstName: string; username: string; profile: Record<string, unknown> }>} */
const USERS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'existing-onboarding@test.local',
    firstName: 'Existing',
    username: 'existinguser',
    profile: {
      terms_and_privacy_accepted_at: now,
      onboarding_completed_at: now,
      audience_role: 'healthcare_worker',
      role_admin: false,
      pulse_board_enabled: true,
    },
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'new-onboarding@test.local',
    firstName: 'New',
    username: 'newuser',
    profile: {
      terms_and_privacy_accepted_at: now,
      onboarding_completed_at: null,
      audience_role: null,
      medical_safety_acknowledged_at: null,
      role_admin: false,
    },
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'admin-onboarding@test.local',
    firstName: 'Admin',
    username: 'adminuser',
    profile: {
      terms_and_privacy_accepted_at: now,
      onboarding_completed_at: now,
      audience_role: 'healthcare_worker',
      role_admin: true,
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'visitor-profile@test.local',
    firstName: 'Visitor',
    username: 'visitoruser',
    profile: {
      terms_and_privacy_accepted_at: now,
      onboarding_completed_at: now,
      audience_role: 'here_to_learn',
      role_admin: false,
      pulse_board_enabled: true,
    },
  },
];

async function ensureUser(admin, spec) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find(
    (u) => u.email === spec.email || u.id === spec.id,
  );

  if (existing && existing.id !== spec.id) {
    await admin.auth.admin.deleteUser(existing.id);
  } else if (existing?.id === spec.id) {
    await admin.auth.admin.updateUserById(spec.id, {
      email: spec.email,
      password: PASSWORD,
      email_confirm: true,
    });
  } else {
    const { error } = await admin.auth.admin.createUser({
      id: spec.id,
      email: spec.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: spec.firstName },
    });
    if (error) throw new Error(`${spec.email} create: ${error.message}`);
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: spec.id,
        display_name: spec.firstName,
        first_name: spec.firstName,
        last_name: 'Tester',
        username: spec.username,
        updated_at: now,
        ...spec.profile,
      },
      { onConflict: 'id' },
    );
  if (profileErr) throw new Error(`${spec.email} profile: ${profileErr.message}`);

  return spec.email;
}

async function main() {
  if (!URL || !SERVICE) {
    throw new Error(
      'Set STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_KEY (see .env.staging.example).',
    );
  }
  if (URL.includes('sakrlbmzmfvdywqgyqxh')) {
    throw new Error('Refusing to seed production Supabase URL');
  }

  const admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created = [];
  for (const spec of USERS) {
    created.push(await ensureUser(admin, spec));
  }

  console.log(
    JSON.stringify(
      {
        supabaseUrl: URL,
        seedUsersCreated: true,
        users: created,
        password: PASSWORD,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
