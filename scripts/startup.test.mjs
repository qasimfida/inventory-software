import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'inventory-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'scripts'));
  for (const name of ['setup.mjs', 'dev.mjs']) {
    copyFileSync(new URL(name, import.meta.url), join(directory, 'scripts', name));
  }
  for (const app of ['api', 'web', 'mobile']) {
    mkdirSync(join(directory, 'apps', app), { recursive: true });
    writeFileSync(join(directory, 'apps', app, '.env.example'), 'EXAMPLE=local\n');
  }
  return directory;
}

test('setup creates missing environment files and preserves customized files across reruns', (t) => {
  const cwd = fixture(t);
  writeFileSync(join(cwd, 'apps/api/.env'), 'CUSTOM=keep-me\n');
  for (let run = 0; run < 2; run += 1) {
    assert.equal(spawnSync(process.execPath, ['scripts/setup.mjs'], { cwd }).status, 0);
  }
  assert.equal(readFileSync(join(cwd, 'apps/api/.env'), 'utf8'), 'CUSTOM=keep-me\n');
  assert.equal(readFileSync(join(cwd, 'apps/web/.env'), 'utf8'), 'EXAMPLE=local\n');
  assert.equal(readFileSync(join(cwd, 'apps/mobile/.env'), 'utf8'), 'EXAMPLE=local\n');
});

test('combined launcher rejects an occupied API port before starting database or build', async (t) => {
  const cwd = fixture(t);
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const port = server.address().port;
  const result = spawnSync(process.execPath, ['scripts/dev.mjs'], {
    cwd,
    env: { ...process.env, npm_execpath: 'must-not-run', HOST: '127.0.0.1', PORT: String(port) },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`Port ${port} on 127.0.0.1 is occupied`));
  assert.equal(server.listening, true);
});
