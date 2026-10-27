import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' }),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(15000);
page.on('pageerror', (e) => errors.push(e.message));
const sku = `QA-OPS-${Date.now()}`,
  out = 'artifacts/qa/operations-expansion';
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill('owner@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  console.log('Login passed');
  await page.goto('http://127.0.0.1:5173/#/catalog');
  await page.getByRole('button', { name: 'Bulk import', exact: true }).click();
  const drawer = page.getByRole('dialog').last();
  const download = page.waitForEvent('download');
  await drawer.getByRole('button', { name: 'Download template' }).click();
  expect((await download).suggestedFilename()).toBe('inventory-products-template.csv');
  console.log('Template downloaded');
  const chooser = page.waitForEvent('filechooser');
  await drawer.getByRole('button', { name: /Choose|Select|Upload/i }).click();
  await (
    await chooser
  ).setFiles({
    name: 'qa-products.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `sku,name,description,price,currency,quantity\n${sku},QA operations product,Local validation,12.50,USD,0\n`,
    ),
  });
  console.log('File selected');
  await expect(drawer.getByText(sku, { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Confirm import of 1 products' }).click();
  await expect(drawer.getByText('1 products imported successfully.')).toBeVisible();
  await page.screenshot({ path: `${out}/import-success.png` });
  await page.keyboard.press('Escape');
  console.log('Import passed');
  await page.getByRole('combobox', { name: 'Search products', exact: true }).fill(sku);
  await page.waitForTimeout(700);
  await page
    .getByRole('button', { name: 'Edit product QA operations product', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Set / adjust price' })).toBeVisible();
  await page.getByRole('button', { name: 'Set / adjust price' }).click();
  await expect(page.getByRole('button', { name: 'Publish price', exact: true })).toBeVisible();
  await page.screenshot({ path: `${out}/product-price-edit.png` });
  await page.getByRole('button', { name: 'Close Variants and pricing', exact: true }).click();
  await page.goto('http://127.0.0.1:5173/#/settings/staff');
  await page.getByRole('button', { name: 'Add staff member', exact: true }).click();
  const form = page.getByRole('form', { name: 'Add staff member' });
  await form.getByLabel('Full name', { exact: true }).fill('QA Operations Staff');
  await form.getByLabel('Employee code', { exact: true }).fill(sku);
  await form.getByRole('button', { name: 'Add staff member', exact: true }).click();
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /QA Operations Staff/ }).first()).toBeVisible();
  await page.screenshot({ path: `${out}/staff-success.png` });
  writeFileSync(
    `${out}/functional.json`,
    JSON.stringify(
      { sku, template: true, import: true, priceEditor: true, staff: true, errors },
      null,
      2,
    ) + '\n',
  );
} catch (e) {
  await page.screenshot({ path: `${out}/functional-error.png` });
  console.error((await page.locator('body').innerText()).slice(-4500));
  throw e;
} finally {
  await browser.close();
}
