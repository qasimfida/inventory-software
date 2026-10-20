import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = relative(root, process.cwd()).replaceAll('\\', '/');
if (!/^(apps|packages)\/[\w-]+$/.test(workspace))
  throw new Error('Run through a workspace test script.');
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--root',
    root,
    '--config',
    resolve(root, 'vitest.config.ts'),
    workspace,
  ],
  { cwd: root, stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
