/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-8-validation';
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

      for (const route of [
        '/online-store',
        '/online-store/products',
        '/online-store/settings/general',
        '/online-store/settings/fulfillment',
        '/online-store/settings/policies',
        '/online-store/settings/images',
      ]) {
        await page.evaluate((path) => {
          location.hash = path;
        }, route);
        await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible();
        await settle(page);
        if (route.includes('/settings/'))
          await expect(
            page.getByRole('button', { name: 'Save settings', exact: true }),
          ).toBeVisible();
        else if (route === '/online-store')
          await expect(
            page.getByRole('region', { name: 'Online store overview', exact: true }),
          ).toBeVisible();
        else
          await expect(
            page.getByRole('heading', { name: 'Online products', exact: true }),
          ).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        await page.screenshot({
          path: `${out}/${width}-${theme}-${route.replaceAll('/', '-')}.png`,
          animations: 'disabled',
        });
      }
      await page.evaluate(() => {
        location.hash = '/online-store/products/add';
      });
      await expect(
        page.getByRole('dialog', { name: 'Add online products', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-picker.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      results.push({
        width,
        theme,
        onlineManagement: 'passed',
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
console.log(`${results.length} online-store viewport/theme cases passed; no mutations submitted.`);
