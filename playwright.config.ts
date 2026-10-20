import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5180',
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -w @inventory/web -- --port 5180',
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:3100' },
  },
});
