import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(root, process.argv[2] ?? 'artifacts/api');
if (existsSync(destination))
  throw new Error('Output already exists; choose a fresh output directory.');
mkdirSync(destination, { recursive: true });
const original = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = {
  name: 'inventory-api-runtime',
  version: '0.0.0',
  private: true,
  type: 'module',
  engines: original.engines,
  packageManager: original.packageManager,
  workspaces: ['apps/api', 'packages/contracts', 'packages/domain'],
  scripts: {
    start: 'node start.mjs',
    'db:migrate': 'node apps/api/dist/database/migrate-cli.js --production',
    'auth:admin': 'node apps/api/dist/auth/admin-cli.js --production',
  },
};
writeFileSync(resolve(destination, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(
  resolve(destination, 'start.mjs'),
  "process.env.NODE_ENV = 'production';\nawait import('./apps/api/dist/main.js');\n",
);
for (const workspace of manifest.workspaces) {
  mkdirSync(resolve(destination, workspace), { recursive: true });
  const source = JSON.parse(readFileSync(resolve(root, workspace, 'package.json'), 'utf8'));
  delete source.scripts;
  delete source.devDependencies;
  cpSync(resolve(root, workspace, 'dist'), resolve(destination, workspace, 'dist'), {
    recursive: true,
    filter: (source) => source !== resolve(root, 'apps/api/dist/development'),
  });
  writeFileSync(
    resolve(destination, workspace, 'package.json'),
    JSON.stringify(source, null, 2) + '\n',
  );
}
cpSync(resolve(root, 'apps/api/migrations'), resolve(destination, 'apps/api/migrations'), {
  recursive: true,
});
// Preserve exact versions/integrities from the repository lock; npm prunes unrelated workspaces.
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
lock.name = manifest.name;
lock.packages[''] = { ...manifest };
for (const workspace of ['apps/web', 'apps/mobile', 'apps/desktop', 'packages/api-client'])
  delete lock.packages[workspace];
for (const [key, entry] of Object.entries(lock.packages)) {
  if (entry.link && !lock.packages[entry.resolved]) delete lock.packages[key];
}
writeFileSync(resolve(destination, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
const result = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'install',
    '--package-lock-only',
    '--ignore-scripts',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
  ],
  { cwd: destination, stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  `API-only artifact prepared at ${destination}. Run npm ci --omit=dev there, then inject production environment and npm start.`,
);
