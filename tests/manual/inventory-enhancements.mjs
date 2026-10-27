/* global document, innerWidth, location, window */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [],
  errors = [];
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push({ width, colorScheme, error: e.message }));
      await page.goto('http://127.0.0.1:5188');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page).toHaveURL(/dashboard/);
      await page.evaluate(() => {
        location.hash = '/inventory';
      });
      const overview = page.getByRole('region', { name: 'Inventory overview' });
      await expect(overview.locator('tbody tr')).toHaveCount(25);
      await expect(
        overview.getByRole('combobox', { name: 'Search inventory products' }),
      ).toBeVisible();
      await overview.getByRole('button', { name: /Out of stock/ }).click();
      await expect(overview.locator('tbody tr')).toHaveCount(4);
      await expect(overview.getByRole('navigation')).toHaveCount(0);
      await overview.getByRole('button', { name: 'Grid view' }).click();
      await overview.getByRole('button', { name: /^View Oak dining chair/ }).click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toContainText('HP-001');
      const bounds = await drawer.boundingBox();
      expect(Math.abs(bounds.x + bounds.width - width)).toBeLessThan(2);
      expect(bounds.width).toBeLessThanOrEqual(432);
      await page.keyboard.press('Escape');
      await overview.getByRole('button', { name: 'List view' }).click();
      await overview.getByRole('button', { name: /Total products/ }).click();
      await overview.getByRole('combobox').fill('HP-002');
      await expect(overview.locator('tbody tr')).toHaveCount(1);
      await expect(overview.getByRole('option')).toContainText('HP-002');
      await overview.getByRole('button', { name: 'Clear search' }).click();
      await expect(overview.locator('tbody tr')).toHaveCount(25);
      await page.locator('.app-header').getByRole('button', { name: 'Open profile menu' }).click();
      await expect(page.getByRole('menu')).toContainText('owner');
      await page.getByRole('menuitem', { name: 'Preferences', exact: true }).click();
      await page.getByRole('radio', { name: 'circle', exact: true }).locator('..').click();
      await expect(page.locator('html')).toHaveAttribute('data-radius', 'circle');
      await page.getByRole('radio', { name: 'scroll', exact: true }).locator('..').click();
      await page.keyboard.press('Escape');
      await expect(overview.getByRole('navigation')).toHaveCount(0);
      await expect(overview.locator('tbody tr')).toHaveCount(25);
      await overview
        .getByRole('button', { name: 'Load more inventory products' })
        .scrollIntoViewIfNeeded();
      await expect(overview.locator('tbody tr')).toHaveCount(36);
      await expect(overview.locator('tbody')).toContainText('HP-001');
      await expect(overview.locator('tbody')).toContainText('HP-036');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/qa/inventory-enhancements/web-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.locator('.app-header').getByRole('button', { name: 'Open profile menu' }).click();
      await page.getByRole('menuitem', { name: 'Preferences', exact: true }).click();
      await page.getByRole('radio', { name: 'pages', exact: true }).locator('..').click();
      await page.getByRole('radio', { name: 'rounded', exact: true }).locator('..').click();
      await page.keyboard.press('Escape');
      await expect(overview.locator('tbody tr')).toHaveCount(25);
      await expect(overview.getByRole('button', { name: 'Page 2', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      results.push({
        width,
        colorScheme,
        search: 'pass',
        singlePageHidden: 'pass',
        gridDrawer: 'pass',
        scrollAppend: 'pass',
        preferenceSwitch: 'pass',
        overflow: false,
      });
      await context.close();
    }
} finally {
  await browser.close();
  await writeFile(
    'artifacts/qa/inventory-enhancements/browser-results.json',
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
}
if (errors.length) throw new Error(JSON.stringify(errors));
console.log(`${results.length} enhancement workflows passed.`);
