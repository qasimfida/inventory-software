/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { applyCaptureTheme, choose, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-notifications-logs-validation';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('https://**', (r) => r.abort());
  await page.goto('http://127.0.0.1:5197');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/dashboard/);
  await choose(page, 'Role', 'superadmin');
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await applyCaptureTheme(page, theme);
      await page.evaluate(() => {
        location.hash = '/logs';
      });
      await settle(page);
      const center = page.getByRole('region', { name: 'Security center', exact: true });
      await center.getByRole('button', { name: 'My security events', exact: true }).click();
      await center.getByRole('button', { name: 'View details', exact: true }).first().click();
      await expect(page.getByRole('dialog')).toContainText('Login attempt');
      await page.screenshot({ path: `${out}/${width}-${theme}-security-detail.png` });
      await page.keyboard.press('Escape');
      for (const name of ['Notification delivery failures', 'Restricted diagnostics']) {
        await center.getByRole('button', { name, exact: true }).click();
        await settle(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        await page.screenshot({
          path: `${out}/${width}-${theme}-${name.replaceAll(' ', '-')}.png`,
        });
      }
    }
  console.log(
    '4 security viewport/theme cases passed: own events, details, delivery empty state and diagnostics.',
  );
} finally {
  await browser.close();
}
