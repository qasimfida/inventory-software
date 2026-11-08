import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual',
  workers: 1,
  timeout: 45000,
  snapshotPathTemplate:
    '{testDir}/../../.ai/reports/redesign/phase-10-validation/visual-baseline/{arg}{ext}',
  outputDir: '.ai/reports/redesign/phase-10-validation/visual-results',
  use: {
    baseURL: 'http://127.0.0.1:5197',
    channel: 'chrome',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -w @inventory/web -- --port 5197',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: !process.env.CI,
    env: { VITE_USE_MOCKS: 'true', VITE_API_BASE_URL: 'http://127.0.0.1:3100' },
  },
});
