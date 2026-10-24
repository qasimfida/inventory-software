import { defineConfig } from 'vitest/config';
import { nestTestTransform } from './scripts/nest-test-transform.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [nestTestTransform()],
  resolve: { alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) } },
  test: {
    include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
    exclude: ['**/*.integration.test.ts', '**/node_modules/**', '**/dist/**'],
    environment: 'node',
    setupFiles: ['./tests/dom-setup.ts'],
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://127.0.0.1:3100',
      EXPO_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3100',
    },
  },
});
