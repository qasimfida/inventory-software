/* global window,document,location,innerWidth,getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [],
  errors = [];
async function choose(page, label, value) {
  const target = page.getByRole('combobox', { name: label, exact: true });
  await target.click();
  await page.getByRole('option', { name: value, exact: true }).click();
}
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme }),
        page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:5188');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
      await page.evaluate(() => {
        location.hash = '/pos';
      });
      const pos = page.getByRole('heading', { name: 'Point of sale', level: 2 });
      await expect(pos).toBeVisible();
      await expect(page.locator('header').getByRole('button', { name: /back/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Back to management' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Checkout warehouse' })).toContainText(
        'warehouse',
      );
      const search = page.getByRole('combobox', { name: 'POS product search' });
      await search.fill('HP-001');
      await expect(page.getByRole('option', { name: /HP-001.*USD/ })).toBeVisible();
      await search.press('Enter');
      await expect(page.getByRole('option', { name: /HP-001.*USD/ })).toBeVisible();
      await page.getByRole('option', { name: /HP-001.*USD/ }).click();
      await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
      if (width === 1440) {
        await page.getByRole('button', { name: 'Switch workspace' }).click();
        await expect(page.getByRole('dialog', { name: 'Switch workspace' })).toContainText(
          'Finish or clear',
        );
        await expect(
          page
            .getByRole('dialog')
            .getByRole('button', { name: /Harbor & Pine Home/ })
            .first(),
        ).toBeDisabled();
        await page.getByRole('button', { name: 'Close workspace switcher' }).click();
        expect(await page.locator('.pos-cart').evaluate((e) => getComputedStyle(e).position)).toBe(
          'sticky',
        );
      }
      await page.screenshot({
        path: `docs/qa/interaction-refinement/pos-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.evaluate(() => {
        location.hash = '/inventory';
      });
      await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
      await expect(page.getByRole('table').first()).toBeVisible();
      await page
        .getByRole('button', { name: /Actions for/ })
        .first()
        .click();
      await expect(page.getByRole('menuitem', { name: 'View details' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Adjust stock' })).toBeVisible();
      await page.keyboard.press('Escape');
      const table = page.locator('.inventory-snapshot table');
      expect(await table.evaluate((e) => getComputedStyle(e).borderSpacing)).toBe('0px');
      await page.addScriptTag({ content: axe.source });
      const a11y = await page.evaluate(() =>
        window.axe.run(document.querySelector('main'), {
          runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        }),
      );
      await page.screenshot({
        path: `docs/qa/interaction-refinement/inventory-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Open profile menu' }).last().click();
      await page.getByRole('menuitem', { name: 'Theme', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Theme', exact: true })).toBeVisible();
      await choose(page, 'Appearance', 'System');
      await page.getByRole('button', { name: 'Close theme' }).click();
      await page.evaluate(() => {
        location.hash = '/settings/preferences';
      });
      await expect(page.getByRole('radio', { name: 'violet', exact: true })).toBeVisible();
      await page.getByRole('radio', { name: 'violet', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-accent', 'violet');
      await choose(page, 'Font', 'Karla');
      await expect
        .poll(() => page.locator('body').evaluate((e) => getComputedStyle(e).fontFamily))
        .toContain('Karla');
      await page.screenshot({
        path: `docs/qa/interaction-refinement/preferences-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: /^Notifications/ }).hover();
      await expect(
        page.getByRole('region', { name: 'Recent notifications' }).getByRole('menu'),
      ).toBeVisible();
      await page.getByRole('menuitem', { name: 'View all notifications' }).click();
      await expect(page).toHaveURL(/notifications/);
      results.push({
        width,
        colorScheme,
        pos: 'pass',
        suggestions: 'pass',
        cart: 'pass',
        table: 'pass',
        preferences: 'pass',
        notifications: 'pass',
        accessibility: a11y.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
      await context.close();
    }
} finally {
  await writeFile(
    'docs/qa/interaction-refinement/browser-results.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ results, errors }, null, 2));
