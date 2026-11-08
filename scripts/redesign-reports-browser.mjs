/* global location, document, innerWidth, getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle, choose } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-reports-validation';
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
        location.hash = '/reports';
      });
      await expect(page.getByRole('region', { name: 'Report results', exact: true })).toBeVisible();
      const categories = [
        'Sales',
        'Purchases',
        'Cash payments',
        'Receivables',
        'Payables',
        'Inventory / low stock',
        'Stock movements',
      ];
      for (const category of categories) {
        await choose(page, 'Report', category);
        await page.getByRole('button', { name: 'Run report', exact: true }).click();
        await expect(
          page
            .getByRole('region', { name: 'Report results', exact: true })
            .getByRole('heading', { name: category, exact: true }),
        ).toBeVisible();
        await settle(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        await page.screenshot({
          path: `${out}/${width}-${theme}-${category.split(' ')[0]}.png`,
          animations: 'disabled',
        });
      }
      if (width === 1440) {
        await choose(page, 'Report', 'Inventory / low stock');
        await choose(page, 'Stock filter', 'Low stock only');
        await page.getByRole('button', { name: 'Run report', exact: true }).click();
        await settle(page);
        await page.screenshot({ path: `${out}/${theme}-low-stock.png`, animations: 'disabled' });
        await choose(page, 'Report', 'Sales');
        await page.getByRole('button', { name: 'Run report', exact: true }).click();
        await settle(page);
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export shown rows', exact: true }).click();
        const download = await downloadPromise;
        await download.saveAs(`${out}/${theme}-shown.csv`);
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('.report-export')).toBeHidden();
        await expect(page.getByRole('region', { name: 'Report table', exact: true })).toBeVisible();
        expect(
          await page.locator('.report-results').evaluate((el) => getComputedStyle(el).color),
        ).toBe('rgb(0, 0, 0)');
        await page.pdf({ path: `${out}/${theme}-report.pdf`, format: 'A4', printBackground: true });
        await page.screenshot({ path: `${out}/${theme}-print.png` });
        await page.emulateMedia({ media: 'screen' });
        await choose(page, 'Scenario', 'empty');
        await expect(
          page.getByText('No matching records for this report.', { exact: true }),
        ).toBeVisible();
        await page.screenshot({ path: `${out}/${theme}-empty.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'error');
        await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.screenshot({ path: `${out}/${theme}-error.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'normal');
        await expect(
          page.getByRole('region', { name: 'Report results', exact: true }),
        ).toBeVisible();
      }
      results.push({ width, theme, categories, exportPrintAndFailures: width === 1440 });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`${results.length} viewport/theme cases passed; seven report categories each.`);
