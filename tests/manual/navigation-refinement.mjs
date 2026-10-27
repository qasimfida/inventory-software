/* global document,location,innerWidth,getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [],
  errors = [];
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme }),
        page = await context.newPage();
      page.setDefaultTimeout(10000);
      console.log(width, colorScheme);
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:5188');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
      await expect(page.locator('header .profile-trigger')).toHaveCount(0);
      await page.evaluate(() => {
        location.hash = '/pos';
      });
      await expect(page.getByRole('heading', { name: 'Point of sale', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Product filters' }).click();
      await expect(page.getByRole('combobox', { name: 'Product category' })).toBeVisible();
      await page.getByRole('combobox', { name: 'Product category' }).click();
      await page.getByPlaceholder('Search options…').fill('unmatched');
      await expect(page.getByText('No matching options.', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Product filters' })).toBeFocused();
      const search = page.getByRole('combobox', { name: 'Find checkout customer' });
      await search.click();
      await search.fill('New example customer');
      await expect(page.getByRole('option', { name: /Add customer/ })).toBeVisible();
      await page.getByRole('option', { name: /Add customer/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/qa/navigation-refinement/pos-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.evaluate(() => {
        location.hash = '/inventory';
      });
      await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
      await expect(page.getByRole('table').first().locator('tbody tr')).toHaveCount(25);
      await expect(async () => {
        const all = page.getByRole('checkbox', { name: /Select loaded/ });
        if (!(await all.isChecked())) await all.click();
        await expect(all).toBeChecked();
      }).toPass();
      await expect(page.getByText(/\d+ selected/, { exact: true })).toBeVisible();
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/qa/navigation-refinement/inventory-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.evaluate(() => {
        location.hash = '/customers';
      });
      await expect(
        page.getByRole('heading', { name: 'Customers and credit', exact: true }),
      ).toBeVisible();
      await page.getByRole('tab', { name: 'customers grid view', exact: true }).click();
      await expect(page.locator('.inventory-product-card').first()).toBeVisible();
      await page.evaluate(() => {
        location.hash = '/settings/company';
      });
      await expect(
        page.getByRole('heading', { name: 'Company profile', exact: true }),
      ).toBeVisible();
      expect(
        await page.locator('.settings-tabs').evaluate((e) => getComputedStyle(e).display),
      ).toBe('flex');
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/qa/navigation-refinement/company-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.addScriptTag({ content: axe.source });
      const a11y = await page.evaluate(async () =>
        (
          await globalThis.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          })
        ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      );
      results.push({ width, colorScheme, a11y });
      await context.close();
    }
} finally {
  await writeFile(
    'artifacts/qa/navigation-refinement/browser-results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
expect(errors).toEqual([]);
expect(results.flatMap((r) => r.a11y)).toEqual([]);
