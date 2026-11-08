/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle, choose } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-platform-admin-validation';
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
    await choose(page, 'Role', 'superadmin');
    for (const theme of ['light', 'dark']) {
      await applyCaptureTheme(page, theme);

      await page.evaluate(() => {
        location.hash = '/admin';
      });
      await expect(
        page.getByRole('region', { name: 'Platform overview', exact: true }),
      ).toBeVisible();
      await settle(page);
      await page.screenshot({
        path: `${out}/${width}-${theme}-overview.png`,
        animations: 'disabled',
      });
      await page.evaluate(() => {
        location.hash = '/admin/businesses';
      });
      const region = page
        .getByRole('region', { name: 'Registered businesses', exact: true })
        .first();
      const open = page.getByRole('button', { name: 'Harbor & Pine Home', exact: true });
      await expect(open).toBeVisible();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({
        path: `${out}/${width}-${theme}-directory.png`,
        animations: 'disabled',
      });
      await open.click();
      await expect(page.getByRole('dialog')).toContainText('Business reference');
      await page.screenshot({
        path: `${out}/${width}-${theme}-details.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await region.getByRole('tab', { name: 'Businesses grid view', exact: true }).click();
      await page.getByRole('button', { name: 'View locations', exact: true }).first().click();
      await expect(page.getByRole('dialog')).toContainText('Stores');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Add business', exact: true }).click();
      await expect(page.getByLabel('Business name', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');

      if (width === 1440) {
        await page
          .getByLabel('Search registered businesses', { exact: true })
          .fill('No matching company 123');
        await expect(page.getByText('No matching businesses', { exact: true })).toBeVisible();
        await page.getByLabel('Search registered businesses', { exact: true }).fill('');
        await choose(page, 'Scenario', 'empty');
        await expect(page.getByText('No registered businesses', { exact: true })).toBeVisible();
        await choose(page, 'Scenario', 'normal');
        await expect(
          page.getByRole('button', { name: 'Harbor & Pine Home', exact: true }),
        ).toBeVisible();
      }
      results.push({
        width,
        theme,
        overviewAndDirectory: 'passed',
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
  `${results.length} platform-admin viewport/theme cases passed; no mutations submitted.`,
);
