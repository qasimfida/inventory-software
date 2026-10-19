import { spawn, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { root } from './setup.mjs';

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Start with npm run dev.');
const environment = parseEnv(readFileSync(new URL('../apps/api/.env', import.meta.url), 'utf8'));
for (const [host, port] of [
  [
    process.env.HOST ?? environment.HOST ?? '127.0.0.1',
    Number(process.env.PORT ?? environment.PORT ?? 3100),
  ],
  ['127.0.0.1', 5173],
]) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () =>
      reject(
        new Error(
          `Port ${port} on ${host} is occupied. Stop the existing dev server or change the API PORT and client API origins together. See README.md.`,
        ),
      ),
    );
    server.listen(port, host, () => server.close(resolve));
  });
}
const database = process.env.DATABASE_URL ?? environment.DATABASE_URL;
if (database === 'postgresql://inventory:local-development-only@127.0.0.1:5433/inventory') {
  const result = spawnSync(process.execPath, ['scripts/local-database.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Build once before starting watchers so parallel clients cannot race shared output.
const build = spawnSync(process.execPath, [npm, 'run', 'build', '-w', '@inventory/api'], {
  cwd: root,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);
const children = [
  spawn(process.execPath, ['scripts/dev.mjs'], { cwd: `${root}apps/api`, stdio: 'inherit' }),
  spawn(process.execPath, [`${root}node_modules/vite/bin/vite.js`, '--host', '127.0.0.1'], {
    cwd: `${root}apps/web`,
    stdio: 'inherit',
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
