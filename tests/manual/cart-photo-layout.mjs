/* global location, document, getComputedStyle, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const out = 'docs/qa/cart-photo-layout';
const browser = await chromium.launch({ channel: 'chrome' });
const results = { layouts: [], errors: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => results.errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill('owner@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Payment guidance' })).toBeVisible();
  expect(
    await page
      .getByRole('button', { name: 'Payment guidance' })
      .evaluate((el) => !!el.closest('h2')),
  ).toBe(true);
  for (const width of [1440, 1000, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const sizes = await page.locator('.product-grid').evaluate((el) => ({
      columns: getComputedStyle(el).gridTemplateColumns,
      available: el.clientWidth,
      card: el.querySelector('.product-card').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(sizes.overflow).toBe(false);
    expect(sizes.card).toBeGreaterThan(200);
    results.layouts.push({ width, ...sizes });
    await page.screenshot({ path: `${out}/pos-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const search = page.getByRole('combobox', { name: 'POS product search', exact: true });
  await search.fill('SHOW-BAG');
  const add = page.getByRole('button', { name: 'Add SHOW-BAG · Canvas market bag', exact: true });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.locator('.cart-line-total')).toBeVisible();
  const row = page.locator('.cart-line-price-row');
  await expect(page.locator('.cart-line .cart-thumbnail')).toBeVisible();
  const quantity = await row.locator('.quantity-control').boundingBox();
  const amount = await row.locator('.cart-line-price-unit').boundingBox();
  expect(amount.x).toBeGreaterThan(quantity.x);
  expect(Math.abs(amount.y - quantity.y)).toBeLessThan(24);
  await expect(
    page.locator('.cart-line-discount').getByRole('button', { name: 'Discount for line 1' }),
  ).toBeVisible();
  await page.screenshot({ path: `${out}/cart.png` });
  await page.getByRole('button', { name: 'Remove line 1', exact: true }).click();
  for (const route of ['/catalog', '/inventory']) {
    await page.evaluate((route) => {
      location.hash = route;
    }, route);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page.locator('main .data-table, main .catalog-product-grid').first(),
    ).toBeVisible();
    expect(await page.locator('main').getByRole('checkbox').count()).toBe(0);
  }
  expect(results.errors).toEqual([]);
  results.passed = true;
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
