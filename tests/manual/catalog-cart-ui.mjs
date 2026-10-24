/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5188');
  await page.getByLabel('Account email', { exact: true }).fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.evaluate(() => (location.hash = '/catalog'));
  await expect(page.locator('.catalog-product-grid > li').first()).toBeVisible();
  expect(
    (await page.locator('.catalog-product-grid > li').first().boundingBox()).width,
  ).toBeLessThan(350);
  await page
    .getByRole('checkbox', { name: /^Select / })
    .nth(1)
    .click();
  await page.getByRole('tab', { name: 'Catalog list view' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /^Select / }).nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Filter product status' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Catalog grid view' }).click();
  await page
    .getByRole('button', { name: /^View details for/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'Product detail' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Product detail' }).click();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({
      path: `docs/qa/catalog-cart/catalog-${width}.png`,
      animations: 'disabled',
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => (location.hash = '/inventory'));
  await page.getByRole('button', { name: /^Inventory warehouse/ }).click();
  await expect(page.getByRole('combobox', { name: /^Inventory warehouse/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Inventory grid view' }).click();
  await expect(page.locator('.product-card .product-art').first()).toBeVisible();
  await page.getByRole('button', { name: 'Adjust stock', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Adjust stock' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /^Stock item/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close Adjust stock' }).click();
  await page.evaluate(() => (location.hash = '/pos'));
  await page
    .getByRole('button', { name: /^Add HP-/ })
    .first()
    .click();
  const cart = page.getByRole('complementary', { name: 'Cart details' });
  await expect(cart.getByLabel('Quantity 1', { exact: true })).toHaveValue('1');
  await cart.getByRole('button', { name: 'Increase Quantity 1' }).click();
  await expect(cart.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
  await cart.getByRole('button', { name: /^View details for/ }).click();
  await expect(page.getByRole('dialog', { name: 'Product details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Product details' }).click();
  await cart.getByRole('button', { name: 'Discount for line 1' }).click();
  await page.getByLabel('Manual discount (%)').fill('10');
  await page.getByRole('button', { name: 'Apply discount' }).click();
  await expect(cart).toContainText('10% discount');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const remove = await cart.getByRole('button', { name: 'Remove line 1' }).boundingBox();
    const quantity = await cart.getByRole('button', { name: 'Increase Quantity 1' }).boundingBox();
    expect(quantity.y).toBeGreaterThan(remove.y);
    await cart.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `docs/qa/catalog-cart/cart-${width}.png`,
      animations: 'disabled',
    });
    results.push({ width, cartControlsUnderDelete: true, noPageOverflow: true });
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await writeFile(
    'docs/qa/catalog-cart/browser-results.json',
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
}
