/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-warehouse-validation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const width of [390, 844, 1024, 1280, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 844 ? 390 : 900 },
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://**', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
    await page.goto('http://127.0.0.1:5197');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(/dashboard/);
    for (const theme of ['light', 'dark']) {
      await applyCaptureTheme(page, theme);
      await page.evaluate(() => {
        location.hash = '/warehouse';
      });
      const open = page.getByRole('button', {
        name: 'Stock counts / warehouse scanning',
        exact: true,
      });
      await expect(
        open.or(
          page.getByRole('button', { name: 'Close count / scanning workbench', exact: true }),
        ),
      ).toBeVisible();
      if (await open.isVisible()) await open.click();
      await page.getByRole('button', { name: 'List saved count sessions', exact: true }).click();
      await page
        .getByRole('button', { name: /^Resume / })
        .first()
        .click();
      await expect(page.getByRole('region', { name: 'Count lines', exact: true })).toBeVisible();
      await settle(page);
      await page.screenshot({
        path: `${out}/${width}-${theme}-counts.png`,
        animations: 'disabled',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.evaluate(() => {
        location.hash = '/storage';
      });
      await expect(
        page.getByRole('button', { name: 'Warehouse balances', exact: true }),
      ).toBeVisible();
      await settle(page);
      await page.screenshot({
        path: `${out}/${width}-${theme}-storage.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Warehouse balances', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Warehouse balances', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-balances.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await page.getByRole('tab', { name: 'Browse hierarchy', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Browse locations', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-hierarchy.png`,
        animations: 'disabled',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.getByRole('tab', { name: 'Locations', exact: true }).click();
      results.push({
        width,
        theme,
        counts: 'passed',
        storage: 'passed',
        balances: 'passed',
        hierarchy: 'passed',
      });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`${results.length} warehouse viewport/theme cases passed; no transaction submitted.`);
