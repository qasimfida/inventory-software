import { spawnSync } from 'node:child_process';
import { openSync, closeSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
// Operator-only CLI: never exposed through tenant HTTP APIs.
const [action, file, target] = process.argv.slice(2);
if (
  !['backup', 'restore'].includes(action) ||
  !file ||
  (action === 'restore' && !/^inventory_restore_[a-z0-9_]+$/.test(target ?? ''))
)
  throw new Error('Usage: db:backup -- backup FILE | restore FILE inventory_restore_UNIQUE');
if (!process.env.PGSERVICE && !process.env.PGDATABASE)
  throw new Error(
    'Configure PGSERVICE/PGPASSFILE or PostgreSQL environment variables; do not pass credentials on the command line.',
  );
const candidates = [
    process.env.PG_BIN,
    '',
    '/opt/homebrew/opt/postgresql@18/bin',
    '/usr/local/opt/postgresql@18/bin',
  ].filter((v) => v !== undefined),
  suffix = process.platform === 'win32' ? '.exe' : '';
const bin = candidates.find(
  (dir) => spawnSync(join(dir, 'pg_dump' + suffix), ['--version']).status === 0,
);
if (bin === undefined) throw new Error('Install PostgreSQL client tools or configure PG_BIN.');
const run = (name, args, output = 'pipe') => {
  const result = spawnSync(join(bin, name + suffix), args, {
    env: process.env,
    stdio: ['ignore', output, 'pipe'],
    timeout: 600000,
  });
  if (result.status !== 0)
    throw new Error(
      `${name} failed. Existing databases were not overwritten. Inspect restricted operator diagnostics.`,
    );
};
if (action === 'backup') {
  const fd = openSync(resolve(file), 'wx', 0o600);
  try {
    run('pg_dump', ['--format=custom', '--no-owner', '--no-acl'], fd);
  } finally {
    closeSync(fd);
  }
  console.log(
    'Backup written with restrictive file permissions. Encrypt/offsite-store it and test an isolated restore.',
  );
} else {
  if (!existsSync(file)) throw new Error('Backup file does not exist.');
  run('pg_restore', ['--list', resolve(file)]);
  run('createdb', [target]); // Refuses any existing name. Never clean/drop an existing database.
  run('pg_restore', [
    '--exit-on-error',
    '--single-transaction',
    '--no-owner',
    '--no-acl',
    '--dbname',
    target,
    resolve(file),
  ]);
  console.log(
    'Restored to a new isolated database. Run reconciliation and session/offline recovery checks before any cutover.',
  );
}
