import { spawn } from 'node:child_process';
const platform = process.argv[2];
if (!['web', 'mobile', 'desktop'].includes(platform))
  throw new Error('Choose web, mobile or desktop.');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Start with npm run dev:mock:web, dev:mock:mobile or dev:mock:desktop.');
const args = process.argv.slice(3);
const env = { ...process.env, VITE_USE_MOCKS: 'true', EXPO_PUBLIC_USE_MOCKS: 'true' };
const child = spawn(
  process.execPath,
  [npm, 'run', `dev:${platform}`, ...(args.length ? ['--', '--', ...args] : [])],
  { stdio: 'inherit', env },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
