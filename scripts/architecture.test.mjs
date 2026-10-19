import assert from 'node:assert/strict';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ESLint } from 'eslint';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(
  new URL('../node_modules/dependency-cruiser/bin/dependency-cruiser.mjs', import.meta.url),
);

const probes = [
  [
    'Node prefixed import',
    "export { readFile } from 'node:fs/promises';",
    'portable-code-no-node-builtins',
  ],
  ['Node bare import', "export { readFile } from 'fs/promises';", 'portable-code-no-node-builtins'],
  ['UI runtime import', "export { createElement } from 'react';", 'shared-no-platform-runtime'],
  [
    'cross-package source import',
    "export { createApiClient } from '@inventory/api-client';",
    'contracts-are-independent',
  ],
];

for (const [name, source, rule] of probes) {
  test(`dependency boundary rejects ${name}`, async () => {
    const file = new URL(`../packages/contracts/src/audit-${randomUUID()}.ts`, import.meta.url);
    await writeFile(file, source, { flag: 'wx' });
    try {
      const result = spawnSync(
        process.execPath,
        [cli, 'apps', 'packages', '--config', '.dependency-cruiser.cjs'],
        { cwd: root, encoding: 'utf8' },
      );
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.ok((result.stdout + result.stderr).includes(rule), result.stdout + result.stderr);
    } finally {
      await unlink(file);
    }
  });
}

test('JavaScript tooling receives lint rules', async () => {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintText('notDefined();', { filePath: 'scripts/audit-probe.mjs' });
  assert.ok(results[0].messages.some((message) => message.ruleId === 'no-undef'));
});

test('desktop compile-time and packaging icons are present in the expected formats', async () => {
  const directory = new URL('../apps/desktop/src-tauri/', import.meta.url);
  const config = JSON.parse(await readFile(new URL('tauri.conf.json', directory), 'utf8'));
  for (const file of ['icons/icon.png', ...config.bundle.icon]) {
    const bytes = await readFile(new URL(file, directory));
    if (file.endsWith('.png')) {
      assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      assert.equal(bytes[25], 6, 'Tauri expects an RGBA icon');
    } else if (file.endsWith('.ico')) {
      assert.deepEqual(bytes.subarray(0, 4), Buffer.from([0, 0, 1, 0]));
    } else if (file.endsWith('.icns')) {
      assert.equal(bytes.subarray(0, 4).toString(), 'icns');
    }
  }
});
