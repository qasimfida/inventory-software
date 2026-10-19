import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiler = spawn(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '--watch', '--preserveWatchOutput'],
  { stdio: 'inherit' },
);
const server = spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'dist/main.js'], {
  stdio: 'inherit',
});
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  compiler.kill('SIGTERM');
  server.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of [compiler, server]) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
