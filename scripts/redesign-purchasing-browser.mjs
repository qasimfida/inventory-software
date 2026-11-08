/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-purchasing-validation';
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
    page.on('pageerror', (error) => errors.push(error.message));
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
        location.hash = '/purchasing';
      });
      await page.getByRole('button', { name: 'PO-2026-1000', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Delivery receipts', exact: true }),
      ).toBeVisible();
      await settle(page);
      // A scrollable drawer must not flex-shrink its evidence tables into clipped rows.
      for (const label of [
        'Order lines',
        'Delivery receipts',
        'Supplier invoices',
        'Supplier returns',
      ]) {
        const region = page.getByRole('region', { name: label, exact: true });
        expect(await region.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(
          true,
        );
      }
      await page.screenshot({
        path: `${out}/${width}-${theme}-purchasing.png`,
        animations: 'disabled',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.getByRole('button', { name: 'Receive purchase delivery', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Receive purchase delivery', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Delivery quantity', { exact: true })).toHaveValue('1');
      await page.screenshot({
        path: `${out}/${width}-${theme}-receive.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      if (width === 1440) {
        for (const action of ['Return received goods', 'Record supplier invoice reference']) {
          await page.getByRole('button', { name: action, exact: true }).click();
          await expect(page.getByRole('dialog', { name: action, exact: true })).toBeVisible();
          await page.screenshot({
            path: `${out}/${theme}-${action.replaceAll(' ', '-')}.png`,
            animations: 'disabled',
          });
          await page.keyboard.press('Escape');
        }
      }
      await page.getByRole('button', { name: 'Close Purchase PO-2026-1000', exact: true }).click();
      await page.evaluate(() => {
        location.hash = '/payables';
      });
      await page.getByRole('button', { name: 'View invoice INV-1048', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Settlement and credit history', exact: true }),
      ).toBeVisible();
      await settle(page);
      await page.screenshot({
        path: `${out}/${width}-${theme}-payables.png`,
        animations: 'disabled',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page
        .getByRole('button', { name: 'Close Supplier invoice INV-1048', exact: true })
        .click();
      results.push({
        width,
        theme,
        purchasing: 'passed',
        receiptDrawer: 'passed',
        payables: 'passed',
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
  `${results.length} purchasing/receipt/payable viewport-theme cases passed; no transaction submitted.`,
);
