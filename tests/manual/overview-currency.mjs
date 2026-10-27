/* global location, document, innerWidth, window */
import { chromium, expect } from '@playwright/test';
import axe from 'axe-core';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [],
  errors = [];
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:5188');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      const overview = page.getByRole('region', { name: 'Business dashboard' });
      await expect(overview.getByText('Sales today', { exact: true })).toBeVisible();
      await expect(
        overview.getByRole('region', { name: 'Inventory snapshot', exact: true }),
      ).toBeVisible();
      await expect(overview.getByRole('region', { name: 'Quick POS' })).toBeVisible();
      await expect(overview.getByRole('region', { name: 'Top products' })).toContainText('HP-002');
      await page.addScriptTag({ content: axe.source });
      const accessibility = await page.evaluate(async () =>
        window.axe.run(document.querySelector('[aria-label="Business dashboard"]'), {
          runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        }),
      );
      expect(
        accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
      await page.screenshot({
        path: `artifacts/qa/overview-currency/web-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await overview.getByRole('combobox', { name: 'Overview period' }).selectOption('7');
      await overview.getByText('View daily figures', { exact: true }).click();
      await expect(
        overview.getByRole('region', { name: 'Daily sales values' }).locator('tbody tr'),
      ).toHaveCount(7);
      await overview.getByRole('link', { name: /Currency settings/ }).click();
      const currency = page.getByRole('combobox', { name: 'Currency', exact: true });
      await expect(currency).toHaveValue('USD');
      await currency.selectOption('PKR');
      await expect(currency).toBeEnabled();
      await expect(currency).toHaveValue('PKR');
      await page.evaluate(() => {
        location.hash = '/dashboard';
      });
      await expect(
        overview.getByText('No sales in PKR during this period.', { exact: true }),
      ).toBeVisible();
      await expect(
        overview
          .getByRole('region', { name: 'Inventory snapshot', exact: true })
          .locator('tbody tr'),
      ).toHaveCount(4);
      await overview.getByRole('link', { name: /Currency settings/ }).click();
      await currency.selectOption('USD');
      await expect(currency).toBeEnabled();
      await page.evaluate(() => {
        location.hash = '/dashboard';
      });
      await expect(overview.getByRole('region', { name: 'Top products' })).toContainText('HP-002');
      results.push({
        width,
        colorScheme,
        overview: 'pass',
        currencySelection: 'pass',
        currencyIsolation: 'pass',
        trend: 'pass',
        overflow: false,
        accessibilityViolations: accessibility.violations.length,
      });
      await context.close();
    }
} finally {
  await browser.close();
  await writeFile(
    'artifacts/qa/overview-currency/browser-results.json',
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
}
if (errors.length) throw new Error(JSON.stringify(errors));
console.log(`${results.length} overview/currency walkthroughs passed`);
