import assert from 'node:assert/strict';
import { writeFile, readFile, mkdtemp, mkdir, cp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    'shared logic importing presentation tokens',
    "export { palettes } from '@inventory/design-tokens';",
    'domain-and-server-no-design-dependencies',
    'packages/api-client/src/audit.ts',
  ],
  [
    'API importing UI',
    "export { createElement } from 'react';",
    'api-no-ui-native-imports',
    'apps/api/src/audit.ts',
  ],
  [
    'mobile importing browser implementation',
    "export { View } from 'react-native-web';",
    'mobile-no-dom-server-imports',
    'apps/mobile/src/audit.ts',
  ],
  [
    'Node prefixed import',
    "export { readFile } from 'node:fs/promises';",
    'portable-code-no-node-builtins',
  ],
  ['Node bare import', "export { readFile } from 'fs/promises';", 'portable-code-no-node-builtins'],
  ['UI runtime import', "export { createElement } from 'react';", 'shared-no-platform-runtime'],
  [
    'browser-native bridge import',
    "export { View } from 'react-native-web';",
    'shared-no-platform-runtime',
  ],
  [
    'unapproved shared dependency',
    "export { clsx } from 'clsx';",
    'shared-only-approved-dependencies',
  ],
  [
    'cross-package source import',
    "export { createApiClient } from '@inventory/api-client';",
    'contracts-are-independent',
  ],
];

for (const [name, source, rule, location = 'packages/contracts/src/audit.ts'] of probes) {
  test(`dependency boundary rejects ${name}`, async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'inventory-boundary-'));
    for (const name of ['contracts', 'api-client']) {
      await mkdir(join(fixture, 'packages', name), { recursive: true });
      await cp(join(root, 'packages', name, 'src'), join(fixture, 'packages', name, 'src'), {
        recursive: true,
      });
    }
    for (const config of ['.dependency-cruiser.cjs', 'tsconfig.boundaries.json'])
      await cp(join(root, config), join(fixture, config));
    await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'junction');
    await mkdir(join(fixture, 'apps/api/src'), { recursive: true });
    await mkdir(join(fixture, 'apps/mobile/src'), { recursive: true });
    await writeFile(join(fixture, location), source, { flag: 'wx' });
    try {
      const result = spawnSync(
        process.execPath,
        [cli, 'apps', 'packages', '--config', '.dependency-cruiser.cjs'],
        { cwd: fixture, encoding: 'utf8' },
      );
      assert.ok(result.status !== null && result.status > 0, result.stdout + result.stderr);
      assert.ok((result.stdout + result.stderr).includes(rule), result.stdout + result.stderr);
    } finally {
      await rm(fixture, { recursive: true, force: true });
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
