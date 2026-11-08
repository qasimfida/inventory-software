/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-notifications-logs-validation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [];
try {
  for (const width of [390, 844, 1024, 1280, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 844 ? 390 : 900 },
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://**', (r) => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
    await page.goto('http://127.0.0.1:5197');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(/dashboard/);
    for (const theme of ['light', 'dark']) {
      await applyCaptureTheme(page, theme);

      for (const route of ['/notifications', '/logs']) {
        await page.evaluate((path) => {
          location.hash = path;
        }, route);
        await settle(page);
        const title = route === '/logs' ? 'View change details' : 'Purchase order created';
        const trigger =
          route === '/logs'
            ? page.getByRole('button', { name: title }).first()
            : page
                .getByRole('region', { name: 'Notification inbox', exact: true })
                .getByRole('button')
                .first();
        await expect(trigger).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        await page.screenshot({
          path: `${out}/${width}-${theme}-${route.slice(1)}.png`,
          animations: 'disabled',
        });
        await trigger.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({
          path: `${out}/${width}-${theme}-${route.slice(1)}-details.png`,
          animations: 'disabled',
        });
        await page.keyboard.press('Escape');
      }
      results.push({
        width,
        theme,
        inboxAndAudit: 'passed',
        detailDrawers: 'passed',
        overflow: 'passed',
      });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(
  `${results.length} notification/log viewport/theme cases passed; no mutations submitted.`,
);
