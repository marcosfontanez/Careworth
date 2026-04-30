import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'lib', 'database.types.ts');

const projectId = process.env.SUPABASE_PROJECT_REF ?? 'sakrlbmzmfvdywqgyqxh';

try {
  const linked = execSync('npx supabase gen types typescript --linked', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  writeFileSync(outPath, linked, 'utf8');
  console.log('Wrote', outPath, 'from --linked');
} catch {
  try {
    const byId = execSync(
      `npx supabase gen types typescript --project-id ${projectId} --schema public`,
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    );
    writeFileSync(outPath, byId, 'utf8');
    console.log('Wrote', outPath, 'from --project-id', projectId);
  } catch (e) {
    console.error(
      'Could not generate types. Run `npx supabase login` or set SUPABASE_ACCESS_TOKEN, then retry.\n',
      e?.message ?? e,
    );
    process.exit(1);
  }
}
