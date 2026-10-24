/* global location */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const result = { inventoryEdit: false, catalogEdit: false, errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => result.errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill('admin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
  await page.locator('.workspace-option').filter({ hasText: 'Local Development Business' }).click();
  await expect(page.locator('.workspace-copy')).toContainText('Local Development Business');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await page.getByRole('combobox', { name: /Search inventory/ }).fill('SHOW-BAG');
  await page.getByRole('button', { name: 'View Canvas market bag', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product details and pricing', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit product', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Set / adjust price', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Variants and pricing', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByText('Prices are set per sellable variant', { exact: false }),
  ).toBeVisible();
  result.inventoryEdit = true;
  await page.getByRole('button', { name: 'Close Variants and pricing', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await page.getByRole('combobox', { name: 'Search products', exact: true }).fill('SHOW-BAG');
  await page
    .getByRole('button', { name: 'View details for Canvas market bag', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit product details and pricing', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit product', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set / adjust price', exact: true })).toBeVisible();
  result.catalogEdit = true;
  await page.screenshot({ path: 'docs/qa/live-ui-refinement/product-edit.png' });
  expect(result.errors).toEqual([]);
} finally {
  await writeFile('docs/qa/live-ui-refinement/product-edit.json', JSON.stringify(result, null, 2));
  await browser.close();
}
