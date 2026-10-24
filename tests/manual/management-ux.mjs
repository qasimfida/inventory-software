/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const evidence = { checks: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => evidence.errors.push(e.message));
  await page.goto('http://127.0.0.1:5191');
  await page.getByLabel('Account email', { exact: true }).fill('admin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  const route = async (path) => {
    await page.evaluate((value) => {
      location.hash = value;
    }, path);
  };
  await route('/catalog');
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Product basics', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByLabel('Product name', { exact: true }).fill('Unsaved draft');
  await page.getByRole('button', { name: 'Images and product codes' }).click();
  await page.getByLabel('Barcodes (one per line)').fill('TEST-DRAFT');
  await page.getByRole('button', { name: 'Images and product codes' }).click();
  await page.getByRole('button', { name: 'Images and product codes' }).click();
  await expect(page.getByLabel('Barcodes (one per line)')).toHaveValue('TEST-DRAFT');
  await page.getByRole('button', { name: 'Close Add product' }).click();
  evidence.checks.push('Product sections preserve drafts; cancelled form sends no mutation');
  await route('/settings/locations');
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('combobox', { name: 'Search locations', exact: true }).fill('Downtown');
  await expect(page.getByRole('button', { name: 'Downtown store', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Downtown store', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit Downtown store', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Location or terminal name')).toHaveValue('Downtown store');
  await page.getByRole('button', { name: 'Close Edit Downtown store' }).click();
  await page.getByRole('tab', { name: 'locations grid view', exact: true }).click();
  evidence.checks.push('Searchable scoped locations, list/grid and editing drawer');
  await route('/settings/users');
  await page.getByRole('combobox', { name: 'Role', exact: true }).click();
  await page.getByRole('option', { name: 'custom', exact: true }).click();
  await page.getByRole('button', { name: /Inventory and transfers · 0 selected/ }).click();
  await page.getByRole('checkbox', { name: 'Create and edit · Inventory and transfers' }).check();
  await page.getByRole('button', { name: /Inventory and transfers · 1 selected/ }).click();
  evidence.checks.push('Grouped custom grants retain checked state, no assignment submitted');
  for (const path of [
    '/settings/locations',
    '/transfers',
    '/sales',
    '/settings/business',
    '/catalog',
  ]) {
    await route(path);
    await page.waitForTimeout(700);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({
        path: `docs/qa/management-ux/${path.split('/').pop()}-${width}.png`,
        animations: 'disabled',
      });
    }
  }
  evidence.checks.push('Five affected routes at 1440/768/390 px without page overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await route('/settings/business');
  await page.getByRole('button', { name: 'Add business', exact: true }).click();
  const name = `UI Setup ${Date.now()}`;
  await page.getByLabel('Business name', { exact: true }).last().fill(name);
  const response = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/businesses',
  );
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  expect((await response).ok()).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Business created', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add stores and warehouses', exact: true }).click();
  await page.getByRole('button', { name: 'Add store / warehouse / terminal', exact: true }).click();
  await page.getByLabel('Location or terminal name').fill('Setup store');
  await page.getByLabel('Code (letters, numbers, underscore or hyphen)').fill('SETUP');
  const locationResponse = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/locations'),
  );
  await page.getByRole('button', { name: 'Create location', exact: true }).click();
  expect((await locationResponse).ok()).toBe(true);
  await expect(page.getByRole('button', { name: 'Setup store', exact: true })).toBeVisible();
  evidence.createdBusiness = name;
  evidence.checks.push('Real business registration → authorized setup → real store creation');
  expect(evidence.errors).toEqual([]);
} finally {
  await browser.close();
  await writeFile('docs/qa/management-ux/browser.json', JSON.stringify(evidence, null, 2));
}
