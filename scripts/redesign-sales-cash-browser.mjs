/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-sales-cash-validation';
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
        location.hash = '/cash';
      });
      await expect(
        page.getByRole('button', { name: 'Open cash shift', exact: true }),
      ).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `${out}/${width}-${theme}-cash.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page
        .getByRole('region', { name: 'Cash shifts', exact: true })
        .locator('tbody button')
        .first()
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Cash shift details', exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `${out}/${width}-${theme}-shift.png`, animations: 'disabled' });
      if (width === 1440) {
        for (const pattern of [/^Close cash shift d/, /^Cash adjustment /]) {
          const action = page.getByRole('button', { name: pattern });
          const name = await action.textContent();
          await action.click();
          await expect(page.getByRole('dialog', { name: name.trim(), exact: true })).toBeVisible();
          await page.screenshot({
            path: `${out}/${theme}-${pattern.source.includes('adjustment') ? 'adjust' : 'close'}-command.png`,
            animations: 'disabled',
          });
          await page.keyboard.press('Escape');
        }
      }
      await page.getByRole('button', { name: 'Close Cash shift details', exact: true }).click();
      await page.evaluate(() => {
        location.hash = '/sales';
      });
      const list = page.getByRole('tabpanel', { name: 'receipts list view', exact: true });
      await expect(list).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `${out}/${width}-${theme}-sales.png`, animations: 'disabled' });
      await list.locator('tbody button').first().click();
      await expect(
        page.getByRole('button', { name: 'Print / reprint receipt', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-receipt.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Return selected sale line', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Return selected sale line', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Return quantity', { exact: true })).toHaveValue('1');
      await page.screenshot({
        path: `${out}/${width}-${theme}-return.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      if (width === 1440) {
        await page.getByRole('button', { name: 'Void full sale', exact: true }).click();
        await expect(
          page.getByRole('dialog', { name: 'Void full sale', exact: true }),
        ).toBeVisible();
        await page.screenshot({ path: `${out}/${theme}-void-command.png`, animations: 'disabled' });
        await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: 'Close Sale receipt', exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      results.push({
        width,
        theme,
        cash: 'passed',
        shift: 'passed',
        sales: 'passed',
        receipt: 'passed',
        return: 'passed',
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
  `${results.length} sales/cash viewport/theme cases passed; no transaction or printing submitted.`,
);
