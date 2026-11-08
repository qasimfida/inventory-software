/* global document, location, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-5-validation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const width of [390, 844, 1024, 1280, 1440, 1920])
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({
        viewport: { width, height: width === 844 ? 390 : 900 },
        colorScheme: theme,
      });
      page.setDefaultTimeout(10000);
      await page.goto('http://127.0.0.1:5197');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await page.waitForURL(/dashboard/);
      await page.evaluate(() => {
        location.hash = '/pos';
      });
      await applyCaptureTheme(page, theme);
      const add = page.getByRole('button', { name: /^Add HP-/ }).first();
      await add.click();
      await add.click();
      await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
      await expect(page.locator('.cart-line-photo')).toHaveCount(1);
      await page.getByRole('button', { name: 'Increase Quantity 1', exact: true }).click();
      await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('3');
      await page.getByRole('button', { name: 'Decrease Quantity 1', exact: true }).click();
      await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
      const search = page.getByRole('combobox', { name: 'POS product search', exact: true });
      await search.fill('HP-002');
      await search.press('Enter');
      await page.waitForTimeout(400);
      await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
      await search.press('Escape');
      await search.fill('');
      await page.waitForTimeout(450);
      await search.press('Tab');
      if (width < 1100)
        await page.getByRole('button', { name: 'View cart (1 line)', exact: true }).click();
      await page.screenshot({ path: `${out}/${width}-${theme}-cart.png`, animations: 'disabled' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Page overflow at ${width}/${theme}`);
      if (width === 1440 && theme === 'light') {
        await page.getByRole('button', { name: 'Held carts (0/10)', exact: true }).click();
        await page.getByLabel('Cart name (avoid personal information)').fill('Counter');
        await page.getByRole('button', { name: 'Hold current cart', exact: true }).click();
        await expect(page.locator('.cart-line-photo')).toHaveCount(0);
        await page.getByRole('button', { name: 'Resume Counter', exact: true }).click();
        await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
        await page.getByRole('button', { name: 'Held carts (0/10)', exact: true }).click();
        await page.getByRole('button', { name: 'Checkout', exact: true }).click();
        await expect(page.getByLabel('Cash tendered (minor units)', { exact: true })).toBeVisible();
        await page.screenshot({ path: `${out}/payment-review.png`, animations: 'disabled' });
      }
      results.push({
        width,
        theme,
        overflow,
        repeatedAdds: 'merged',
        quantityEdits: 'passed',
        scanEnter: 'search only, no auto-add',
      });
      await page.close();
    }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`${results.length} responsive/theme POS cases passed`);
