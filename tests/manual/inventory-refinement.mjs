/* global document, location, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  errors = [];
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push({ width, colorScheme, message: e.message }));
      await page.goto('http://127.0.0.1:5188');
      await expect(page.getByRole('button', { name: 'Connection', exact: true })).toHaveCount(0);
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page).toHaveURL(/dashboard/);
      await page.evaluate(() => (location.hash = '/inventory'));
      const overview = page.getByRole('region', { name: 'Inventory overview' });
      await expect(overview.getByRole('button', { name: /Total products 36/ })).toBeVisible();
      await overview.getByRole('button', { name: /Out of stock/ }).click();
      await expect(page).toHaveURL(/stock=out-of-stock/);
      await expect(overview.locator('tbody tr')).toHaveCount(4);
      await overview.getByRole('button', { name: /Total products/ }).click();
      await expect(overview.getByRole('button', { name: 'Page 2', exact: true })).toBeVisible();
      await overview.getByRole('button', { name: 'Page 2', exact: true }).click();
      await expect(overview.locator('tbody tr')).toHaveCount(11);
      await overview
        .getByRole('button', { name: 'Search inventory products', exact: true })
        .click();
      await overview.getByRole('combobox').fill('HP-002');
      await expect(overview.locator('tbody tr')).toHaveCount(1);
      await expect(overview.getByRole('option')).toContainText('HP-002');
      await overview.getByRole('combobox').fill('no-such-product');
      await expect(overview.getByText(/No matching products. Try a different SKU/)).toBeVisible();
      await overview.getByRole('button', { name: 'Clear and close search' }).click();
      await expect(overview.locator('tbody tr')).toHaveCount(25);
      await page.screenshot({
        path: `docs/qa/inventory-refinement/web-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.locator('.app-header').getByRole('button', { name: 'Open profile menu' }).click();
      await page.getByRole('menuitem', { name: 'Preferences', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      if (width === 1440) {
        await page.getByRole('button', { name: 'Open preferences', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Preferences');
        await page.keyboard.press('Escape');
      }
      await page
        .locator('.app-header')
        .getByRole('button', { name: 'Search routes and records' })
        .click();
      await page.locator('.app-header').getByRole('combobox').fill('HP-002');
      await expect(page.locator('.app-header').getByRole('option').first()).toContainText('HP-002');
      await page.keyboard.press('Escape');
      await page
        .locator('.app-header')
        .getByRole('button', { name: 'Clear and close search' })
        .click();
      await page.evaluate(() => (location.hash = '/pos'));
      await page
        .getByRole('button', { name: 'Add HP-002 · Linen lounge cushion · Natural 2' })
        .click();
      await expect(page.locator('.checkout-total')).toContainText('USD 30.00');
      await page.getByRole('button', { name: 'Increase Quantity 1', exact: true }).click();
      await expect(page.locator('.checkout-total')).toContainText('USD 60.00');
      await page.getByRole('button', { name: 'Checkout', exact: true }).click();
      await expect(page.getByLabel('Cash applied (minor units)', { exact: true })).toHaveValue(
        '6000',
      );
      await page.evaluate(() => (location.hash = '/inventory'));
      await page.evaluate(() => (location.hash = '/pos'));
      await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow).toBe(false);
      results.push({
        width,
        colorScheme,
        inventory: 'pass',
        search: 'pass',
        pagination: 'pass',
        preferences: 'pass',
        automaticQuote: 'pass',
        cartRetention: 'pass',
        overflow,
      });
      await context.close();
    }
} finally {
  await browser.close();
  await writeFile(
    'docs/qa/inventory-refinement/browser-results.json',
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
}
if (errors.length) throw new Error(JSON.stringify(errors));
console.log(`${results.length} viewport/theme workflows passed.`);
