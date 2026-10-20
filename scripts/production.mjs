import { spawnSync } from 'node:child_process';

const target = process.argv[2];
if (!['api', 'web', 'mobile'].includes(target)) throw new Error('Unknown production target.');
if (target !== 'api') {
  const { parseApiOrigin } = await import('@inventory/api-client');
  const key = target === 'web' ? 'VITE_API_BASE_URL' : 'EXPO_PUBLIC_API_BASE_URL';
  const origin = parseApiOrigin(process.env[key]);
  if (!origin.startsWith('https://'))
    throw new Error(`${key} must be an explicitly supplied HTTPS origin for production.`);
}
const result =
  target === 'api'
    ? spawnSync(process.execPath, ['dist/main.js'], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
      })
    : spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          ...(target === 'mobile' ? { EXPO_NO_DOTENV: '1' } : {}),
        },
      });
process.exitCode = result.status ?? 1;
