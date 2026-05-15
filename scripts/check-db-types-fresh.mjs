/**
 * Fails CI when any migration is newer on disk than lib/database.types.ts.
 * Run `npm run db:types` locally after changing supabase/migrations.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const typesPath = join(root, 'lib', 'database.types.ts');

function latestMigrationMtimeMs(dir) {
  let max = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.sql')) continue;
    const st = statSync(join(dir, name));
    if (st.mtimeMs > max) max = st.mtimeMs;
  }
  return max;
}

if (!existsSync(typesPath)) {
  console.error('Missing lib/database.types.ts — run npm run db:types');
  process.exit(1);
}

const typesMtime = statSync(typesPath).mtimeMs;
const migMax = latestMigrationMtimeMs(migrationsDir);

// Allow small clock skew between files.
if (migMax > typesMtime + 2000) {
  console.error(
    'lib/database.types.ts looks stale vs supabase/migrations (by file mtime).\n' +
      'Regenerate types: npm run db:types\n',
  );
  process.exit(1);
}

console.log('OK: database.types.ts is not older than the newest migration.');
