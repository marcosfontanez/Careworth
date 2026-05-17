import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'lib', 'database.types.ts');

/** Never hardcode a project ref here — it ships in git and identifies your Supabase project. */
const projectId = process.env.SUPABASE_PROJECT_REF?.trim();

try {
  const linked = execSync('npx supabase gen types typescript --linked', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  writeFileSync(outPath, linked, 'utf8');
  console.log('Wrote', outPath, 'from --linked');
} catch {
  if (!projectId) {
    console.error(
      'Could not use --linked. Set SUPABASE_PROJECT_REF to your project ref (Dashboard → Settings → General),\n' +
        'or run `npx supabase link`, then retry.',
    );
    process.exit(1);
  }
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
