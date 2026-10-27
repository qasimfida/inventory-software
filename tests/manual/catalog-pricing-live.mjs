/* global location */
// Creates one retained test product and two effective prices in the isolated local audit database.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const sku = `UI-PRICE-${Date.now()}`;
const evidence = { sku, created: false, prices: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => evidence.errors.push(error.message));
  await page.goto('http://127.0.0.1:5191');
  await page.getByLabel('Account email', { exact: true }).fill('admin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.evaluate(() => (location.hash = '/catalog'));
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill(`Pricing review ${sku}`);
  await page.getByLabel('SKU', { exact: true }).fill(sku);
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith('/products'),
  );
  await page.getByRole('button', { name: 'Save and set price' }).click();
  const response = await created;
  expect(response.ok()).toBe(true);
  const product = await response.json();
  evidence.created = true;
  evidence.productId = product.id;
  await expect(
    page.getByRole('dialog', { name: 'Variants and pricing', exact: true }),
  ).toBeVisible();
  async function price(amount) {
    await page.getByRole('button', { name: 'Publish price', exact: true }).click();
    await page.getByLabel('Base-unit selling price', { exact: false }).fill(amount);
    const published = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/prices'),
    );
    await page.getByRole('button', { name: 'Publish price', exact: true }).last().click();
    const result = await published;
    expect(result.ok()).toBe(true);
    const entry = await result.json();
    evidence.prices.push({
      id: entry.id,
      unitPrice: entry.unitPrice,
      currency: entry.currency,
      variantId: entry.variantId,
    });
    await expect(
      page.getByRole('region', { name: 'Variants and pricing', exact: true }),
    ).toContainText(`${amount}`);
  }
  await price('12.50');
  await page.getByRole('button', { name: 'Close Variants and pricing', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search products', exact: true }).fill(sku);
  await page
    .getByRole('button', { name: `Edit product Pricing review ${sku}`, exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'Edit product' })).toBeVisible();
  await page.getByRole('button', { name: 'Set / adjust price', exact: true }).click();
  await price('14.75');
  await page.screenshot({
    path: 'artifacts/qa/catalog-cart/live-pricing.png',
    animations: 'disabled',
  });
  expect(evidence.errors).toEqual([]);
} finally {
  await browser.close();
  await writeFile(
    'artifacts/qa/catalog-cart/live-pricing-results.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
}
