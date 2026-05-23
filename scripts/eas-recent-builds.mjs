#!/usr/bin/env node
/**
 * Lists recent EAS builds with version/build numbers and submit hints.
 * Run: npm run eas:builds
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_PATH = join(ROOT, 'docs', 'eas-store-submissions.json');

function loadSubmitLog() {
  if (!existsSync(LOG_PATH)) {
    return {
      ios: new Set(),
      android: new Set(),
      lastSubmittedIosBuildNumber: 0,
      lastSubmittedAndroidBuildNumber: 0,
      nextExpectedIosBuildNumber: 1,
    };
  }
  const raw = JSON.parse(readFileSync(LOG_PATH, 'utf8'));
  return {
    ios: new Set((raw.ios ?? []).map((r) => r.buildId)),
    android: new Set((raw.android ?? []).map((r) => r.buildId)),
    lastSubmittedIosBuildNumber: Number(raw.lastSubmittedIosBuildNumber ?? 0),
    lastSubmittedAndroidBuildNumber: Number(raw.lastSubmittedAndroidBuildNumber ?? 0),
    nextExpectedIosBuildNumber: Number(
      raw.nextExpectedIosBuildNumber ?? Number(raw.lastSubmittedIosBuildNumber ?? 0) + 1,
    ),
  };
}

function fetchBuilds(platform) {
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['eas', 'build:list', '--platform', platform, '--limit', '20', '--json', '--non-interactive'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' },
  );
  const start = out.indexOf('[');
  if (start < 0) return [];
  return JSON.parse(out.slice(start));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function buildNumInt(b) {
  return Number.parseInt(String(b.appBuildVersion ?? '0'), 10) || 0;
}

function printSection(title, builds, submittedIds, lastSubmittedBuildNumber) {
  console.log(`\n=== ${title} ===\n`);
  if (!builds.length) {
    console.log('  (no builds)\n');
    return [];
  }

  const storeCandidates = [];

  for (const b of builds) {
    const profile = b.buildProfile ?? '—';
    const dist = b.distribution ?? '—';
    const version = b.appVersion ?? '?';
    const buildNum = b.appBuildVersion ?? '?';
    const buildNumN = buildNumInt(b);
    const status = b.status ?? '?';
    const id = b.id ?? '?';
    const already = submittedIds.has(id);
    const storeReady =
      status === 'FINISHED' &&
      String(dist).toUpperCase() === 'STORE' &&
      profile === 'production';

    let tag = '';
    if (already) {
      tag = ' [ALREADY LOGGED — do not submit again]';
    } else if (storeReady && buildNumN <= lastSubmittedBuildNumber) {
      tag = ' [SUPERSEDED — older than last submitted build number]';
    } else if (storeReady) {
      tag = ' [OK TO SUBMIT TO STORE]';
      storeCandidates.push(b);
    }

    console.log(`  ${version} (${buildNum})  ${profile}  ${dist}  ${status}`);
    console.log(`    id: ${id}`);
    console.log(`    finished: ${fmtDate(b.completedAt ?? b.createdAt)}${tag}`);
    console.log('');
  }

  storeCandidates.sort((a, b) => buildNumInt(b) - buildNumInt(a));
  return storeCandidates;
}

const log = loadSubmitLog();
const ios = fetchBuilds('ios');
const android = fetchBuilds('android');

console.log('PulseVerse — recent EAS builds');
console.log(`Submit log: docs/eas-store-submissions.json`);
console.log(`Last submitted iOS build number: ${log.lastSubmittedIosBuildNumber}`);
console.log(`Next production iOS build number (autoIncrement): ${log.nextExpectedIosBuildNumber}`);

const iosCandidates = printSection(
  'iOS (newest first)',
  ios,
  log.ios,
  log.lastSubmittedIosBuildNumber,
);
printSection(
  'Android (newest first)',
  android,
  log.android,
  log.lastSubmittedAndroidBuildNumber,
);

const iosPick = iosCandidates[0] ?? null;

console.log('--- Submit commands (use build id — never reuse a logged id) ---\n');

if (iosPick) {
  console.log('iOS (production store):');
  console.log(`  eas submit --platform ios --profile production --id ${iosPick.id}`);
  console.log(
    `  npm run eas:log:ios -- ${iosPick.id} ${iosPick.appVersion} ${iosPick.appBuildVersion} submitted`,
  );
} else {
  console.log(`iOS: no build ${log.nextExpectedIosBuildNumber}+ ready to submit yet. Run:`);
  console.log('  eas build --profile production --platform ios');
  console.log(`  (EAS autoIncrement should assign build ${log.nextExpectedIosBuildNumber})`);
  console.log('  npm run eas:builds   # then submit by id from the list');
}

console.log('');
console.log('Android (production → Play internal track):');
console.log('  eas build --profile production --platform android');
console.log('  eas submit --platform android --profile production --id <build-id-from-above>');
console.log('');
console.log('Rule: duplicate build number → NEW eas build, not another submit on the same id.');
