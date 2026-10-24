import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/shell',
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:5190',
    browserName: 'chromium',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -w @inventory/web -- --port 5190',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: false,
    env: { VITE_USE_MOCKS: 'true', VITE_API_BASE_URL: 'http://127.0.0.1:3100' },
  },
});
