/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle, choose } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-payables-validation';
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
        location.hash = '/payables';
      });
      await expect(
        page.getByRole('button', { name: 'View invoice INV-1048', exact: true }),
      ).toBeVisible();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({ path: `${out}/${width}-${theme}-list.png`, animations: 'disabled' });
      await page
        .getByRole('button', { name: /^Filter supplier / })
        .first()
        .click();
      await expect(
        page.getByRole('button', { name: 'Show all suppliers', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Show all suppliers', exact: true }).click();
      await page.getByRole('button', { name: 'View invoice INV-1048', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Invoice balances', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-detail.png`,
        animations: 'disabled',
      });
      expect(
        await page
          .getByRole('region', { name: 'Invoice balances', exact: true })
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      for (const name of [
        'Record supplier cash payment',
        'Record confirmed supplier return credit',
      ]) {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
        await page.screenshot({
          path: `${out}/${width}-${theme}-${name.includes('payment') ? 'payment' : 'credit'}.png`,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: `Close ${name}`, exact: true }).click();
      }
      await page
        .getByRole('button', { name: 'Close Supplier invoice INV-1048', exact: true })
        .click();
      if (width === 1440) {
        await choose(page, 'Scenario', 'empty');
        await expect(
          page.getByText('No supplier invoices in this selection.', { exact: true }),
        ).toBeVisible();
        await page.screenshot({ path: `${out}/${theme}-empty.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'error');
        await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.screenshot({ path: `${out}/${theme}-error.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'normal');
        await expect(
          page.getByRole('button', { name: 'View invoice INV-1048', exact: true }),
        ).toBeVisible();
      }
      results.push({
        width,
        theme,
        list: 'passed',
        filters: 'passed',
        detail: 'passed',
        payment: 'passed',
        credit: 'passed',
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
  `${results.length} payables viewport/theme cases passed; no financial commands submitted.`,
);
