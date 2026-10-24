import { offlineShell } from './offline-shell';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { parseApiOrigin } from '@inventory/api-client';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  if (
    mode === 'production' &&
    (process.env.VITE_USE_MOCKS ?? environment.VITE_USE_MOCKS) === 'true'
  )
    throw new Error('Mock mode is forbidden in production builds.');
  let apiOrigin: string;
  try {
    apiOrigin = parseApiOrigin(process.env.VITE_API_BASE_URL ?? environment.VITE_API_BASE_URL);
  } catch {
    throw new Error(
      'Set VITE_API_BASE_URL to a valid HTTP(S) API origin before starting or building web/desktop.',
    );
  }
  return {
    plugins: [react(), tailwindcss(), offlineShell()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: true, proxy: { '/api': { target: apiOrigin, ws: true } } },
    base: './',
  };
});
