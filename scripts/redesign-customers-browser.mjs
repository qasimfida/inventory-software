/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-customers-validation';
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
        location.hash = '/customers';
      });
      const list = page.getByRole('tabpanel', { name: 'customers list view', exact: true });
      await expect(list).toBeVisible();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({ path: `${out}/${width}-${theme}-list.png`, animations: 'disabled' });
      await list.locator('tbody button').first().click();
      await expect(page.getByLabel('Credit policy', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Receivables', exact: true })).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-details.png`,
        animations: 'disabled',
      });
      expect(
        await page
          .getByRole('region', { name: 'Receivables', exact: true })
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      await page.getByRole('button', { name: 'Save credit policy', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Save credit policy', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-credit.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      if (width === 1440) {
        for (const pattern of [
          /^Save customer /,
          /^Record customer cash payment$/,
          /^Publish customer price$/,
        ]) {
          const button = page.getByRole('button', { name: pattern });
          const name = (await button.textContent()).trim();
          await button.click();
          await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
          await page.screenshot({
            path: `${out}/${theme}-${name.replaceAll(' ', '-')}.png`,
            animations: 'disabled',
          });
          await page.keyboard.press('Escape');
        }
        await page.getByRole('button', { name: 'Archive customer', exact: true }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: 'Cancel', exact: true })
          .click();
      }
      await page.getByRole('button', { name: 'Close Customer details', exact: true }).click();
      await page.getByRole('button', { name: 'Add customer', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Add customer', exact: true })).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-create.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      const search = page.getByRole('combobox', {
        name: 'Search customers / email / phone',
        exact: true,
      });
      await search.fill('no-customer-matches-this');
      await expect(page.getByText('No matching customers.', { exact: true })).toBeVisible();
      await search.fill('');
      await expect(list.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('tab', { name: 'customers grid view', exact: true }).click();
      await expect(
        page.getByRole('tabpanel', { name: 'customers grid view', exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `${out}/${width}-${theme}-grid.png`, animations: 'disabled' });
      await page.getByRole('tab', { name: 'customers list view', exact: true }).click();
      results.push({
        width,
        theme,
        list: 'passed',
        details: 'passed',
        credit: 'passed',
        create: 'passed',
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
  `${results.length} customer viewport/theme cases passed; no transaction or printing submitted.`,
);
