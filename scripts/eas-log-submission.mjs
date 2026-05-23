#!/usr/bin/env node
/**
 * Append a store submission to docs/eas-store-submissions.json
 * Usage: node scripts/eas-log-submission.mjs ios <buildId> <appVersion> <buildNumber> submitted|failed|attempted
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_PATH = join(ROOT, 'docs', 'eas-store-submissions.json');

const [platform, buildId, appVersion, buildNumber, result = 'submitted'] = process.argv.slice(2);

if (!platform || !buildId || !appVersion || !buildNumber) {
  console.error(
    'Usage: node scripts/eas-log-submission.mjs <ios|android> <buildId> <appVersion> <buildNumber> [submitted|failed|attempted]',
  );
  process.exit(1);
}

if (platform !== 'ios' && platform !== 'android') {
  console.error('platform must be ios or android');
  process.exit(1);
}

const data = existsSync(LOG_PATH)
  ? JSON.parse(readFileSync(LOG_PATH, 'utf8'))
  : { _readme: '', ios: [], android: [] };

const list = data[platform] ?? [];
const buildNumN = Number.parseInt(String(buildNumber), 10) || 0;
const entry = {
  buildId,
  appVersion,
  buildNumber: String(buildNumber),
  result,
  loggedAt: new Date().toISOString().slice(0, 10),
};

const idx = list.findIndex((r) => r.buildId === buildId);
if (idx >= 0) list[idx] = { ...list[idx], ...entry };
else list.unshift(entry);

data[platform] = list;

if (platform === 'ios' && result === 'submitted' && buildNumN > 0) {
  const prev = Number(data.lastSubmittedIosBuildNumber ?? 0);
  if (buildNumN >= prev) {
    data.lastSubmittedIosBuildNumber = buildNumN;
    data.nextExpectedIosBuildNumber = buildNumN + 1;
  }
}

if (platform === 'android' && result === 'submitted' && buildNumN > 0) {
  const prev = Number(data.lastSubmittedAndroidBuildNumber ?? 0);
  if (buildNumN >= prev) {
    data.lastSubmittedAndroidBuildNumber = buildNumN;
  }
}

writeFileSync(LOG_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Logged ${platform} ${appVersion} (${buildNumber}) → docs/eas-store-submissions.json`);
if (platform === 'ios' && result === 'submitted') {
  console.log(`Next iOS build number should be: ${data.nextExpectedIosBuildNumber}`);
}
