import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { desktopImageSources } from './desktop-csp.mjs';
const mode = process.argv[2],
  origin = new URL(process.env.DESKTOP_API_ORIGIN ?? process.env.VITE_API_BASE_URL ?? '');
if (
  !['remote', 'local-network'].includes(mode) ||
  origin.protocol !== 'https:' ||
  origin.pathname !== '/' ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash
)
  throw new Error(
    'Choose remote or local-network and set DESKTOP_API_ORIGIN to the verified HTTPS API origin.',
  );
const dir = resolve('.local/desktop-profiles');
mkdirSync(dir, { recursive: true });
const config = resolve(dir, `${mode}.json`);
writeFileSync(
  config,
  JSON.stringify(
    {
      productName: mode === 'remote' ? 'Inventory Remote' : 'Inventory Local Network',
      identifier: `com.inventoryfoundation.${mode === 'remote' ? 'remote' : 'local'}`,
      app: {
        security: {
          csp: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src ${desktopImageSources(process.env.DESKTOP_IMAGE_ORIGINS)}; connect-src 'self' ipc: http://ipc.localhost ${origin.origin} ${origin.origin.replace(/^https:/, 'wss:')}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
        },
      },
    },
    null,
    2,
  ),
);
const result = spawnSync(
  'npm',
  ['run', 'build', '-w', '@inventory/desktop', '--', '--config', config, ...process.argv.slice(3)],
  {
    stdio: 'inherit',
    env: { ...process.env, VITE_API_BASE_URL: origin.origin, VITE_DEPLOYMENT_MODE: mode },
  },
);
process.exitCode = result.status ?? 1;
