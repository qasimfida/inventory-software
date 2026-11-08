/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-transfers-validation';
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
        location.hash = '/transfers';
      });
      await expect(
        page.getByRole('button', { name: 'Create transfer draft', exact: true }),
      ).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `${out}/${width}-${theme}-list.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.getByRole('button', { name: 'Create transfer draft', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Create transfer draft', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-create.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'TR-203', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Transfer lines', exact: true }),
      ).toBeVisible();
      await settle(page);
      const lines = page.getByRole('region', { name: 'Transfer lines', exact: true });
      expect(await lines.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await page.screenshot({
        path: `${out}/${width}-${theme}-detail.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Confirm destination receipt', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Confirm destination receipt', exact: true }),
      ).toBeVisible();
      for (const label of [
        'Good received (base units)',
        'Damaged received (base units)',
        'Confirmed shortage / loss (base units)',
      ])
        await expect(page.getByLabel(label, { exact: true })).toHaveValue('0');
      await page.screenshot({
        path: `${out}/${width}-${theme}-receipt.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Close Transfer details', exact: true }).click();
      if (width === 1440) {
        for (const [reference, actions] of [
          [
            'TR-200',
            ['Add draft transfer line', 'approve transfer TR-200', 'cancel transfer TR-200'],
          ],
          ['TR-201', ['dispatch transfer TR-201', 'cancel transfer TR-201']],
        ]) {
          await page.getByRole('button', { name: reference, exact: true }).click();
          for (const action of actions) {
            await page.getByRole('button', { name: action, exact: true }).click();
            await expect(page.getByRole('dialog', { name: action, exact: true })).toBeVisible();
            await page.screenshot({
              path: `${out}/${theme}-${action.replaceAll(' ', '-')}.png`,
              animations: 'disabled',
            });
            await page.keyboard.press('Escape');
          }
          await page.getByRole('button', { name: 'Close Transfer details', exact: true }).click();
        }
      }
      results.push({
        width,
        theme,
        list: 'passed',
        create: 'passed',
        details: 'passed',
        partialReceipt: 'passed',
      });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`${results.length} transfer viewport/theme cases passed; no transaction submitted.`);
