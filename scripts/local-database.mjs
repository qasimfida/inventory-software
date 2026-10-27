import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.local/', import.meta.url));
const data = join(root, 'postgres');
const executable = process.platform === 'win32' ? '.exe' : '';
const candidates = [
  process.env.PG_BIN,
  '',
  '/opt/homebrew/opt/postgresql@18/bin',
  '/usr/local/opt/postgresql@18/bin',
].filter((value) => value !== undefined);
const bin = candidates.find(
  (directory) => spawnSync(join(directory, `pg_ctl${executable}`), ['--version']).status === 0,
);
if (bin === undefined) {
  console.error(
    'Install PostgreSQL and put its bin directory on PATH, or set PG_BIN. See docs/development.md.',
  );
  process.exit(1);
}
const run = (name, args) =>
  execFileSync(join(bin, `${name}${executable}`), args, { stdio: 'inherit' });
const action = process.argv[2] ?? 'start';
if (!['start', 'stop'].includes(action)) throw new Error('Usage: npm run db:local -- [start|stop]');
if (action === 'stop') {
  if (existsSync(join(data, 'postmaster.pid')))
    run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
} else {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (!existsSync(join(data, 'PG_VERSION'))) {
    const password = join(root, 'init-password');
    writeFileSync(password, 'local-development-only\n', { mode: 0o600 });
    try {
      run('initdb', [
        '-D',
        data,
        '-U',
        'inventory',
        '--auth-local=trust',
        '--auth-host=scram-sha-256',
        `--pwfile=${password}`,
        '--encoding=UTF8',
      ]);
    } finally {
      unlinkSync(password);
    }
  }
  if (spawnSync(join(bin, `pg_ctl${executable}`), ['-D', data, 'status']).status !== 0) {
    // A separate loopback-only cluster; never change the user's existing PostgreSQL server.
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      join(root, 'postgres.log'),
      '-o',
      '-h 127.0.0.1 -p 5433',
      '-w',
      'start',
    ]);
  }
  const environment = { ...process.env, PGPASSWORD: 'local-development-only' };
  const args = ['-h', '127.0.0.1', '-p', '5433', '-U', 'inventory'];
  const exists = execFileSync(
    join(bin, `psql${executable}`),
    [...args, '-d', 'postgres', '-Atc', "SELECT 1 FROM pg_database WHERE datname='inventory'"],
    { env: environment, encoding: 'utf8' },
  ).trim();
  if (exists !== '1')
    execFileSync(join(bin, `createdb${executable}`), [...args, 'inventory'], {
      env: environment,
      stdio: 'inherit',
    });
  console.log(
    'Local development PostgreSQL ready at 127.0.0.1:5433. Stop with npm run db:local -- stop.',
  );
}
