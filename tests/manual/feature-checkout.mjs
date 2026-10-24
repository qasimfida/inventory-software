/* global location */
// Requires the isolated audit database/product; commits one explicitly confirmed test sale.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword, developmentIds } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const account of ['cashier', 'superadmin']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5191');
    await page.getByLabel('Account email', { exact: true }).fill(`${account}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('.app-header')).toBeVisible();
    if (account === 'cashier') {
      await page.evaluate(() => {
        location.hash = '/cash';
      });
      await page.getByRole('button', { name: 'Open cash shift', exact: true }).click();
      const sheet = page.getByRole('dialog');
      await sheet.getByRole('combobox', { name: 'Cash terminal', exact: true }).click();
      await page.getByRole('option', { name: 'Development Register', exact: true }).click();
      await sheet.getByRole('combobox', { name: 'Cash currency', exact: true }).click();
      await page.getByRole('option', { name: 'USD', exact: true }).click();
      const opened = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/cash-shifts'),
      );
      await sheet.getByRole('button', { name: 'Open cash shift', exact: true }).click();
      expect((await opened).status()).toBe(201);
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => {
      location.hash = '/pos';
    });
    await page
      .getByRole('button', { name: 'Add AUDIT-NOTEBOOK · Audit notebook', exact: true })
      .click();
    const cart = page.getByRole('complementary', { name: 'Cart details' });
    await expect(cart.getByLabel('Quantity 1', { exact: true })).toHaveValue('1');
    await expect(cart.locator('.checkout-total')).toContainText('13.75');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    if (account === 'superadmin') {
      await expect(page.getByRole('region', { name: 'Platform overview' })).toBeVisible();
      await page.getByRole('link', { name: 'Point of sale', exact: true }).click();
    }
    await expect(cart.getByLabel('Quantity 1', { exact: true })).toHaveValue('1');
    await expect(cart.locator('.checkout-total')).toContainText('13.75');
    await page.getByRole('link', { name: 'Inventory', exact: true }).click();
    await page.getByRole('link', { name: 'Point of sale', exact: true }).click();
    await expect(cart.getByLabel('Quantity 1', { exact: true })).toHaveValue('1');
    if (account === 'cashier') {
      await cart.getByRole('button', { name: 'Checkout', exact: true }).click();
      await page.getByLabel('Cash tendered (minor units)').fill('1500');
      const saleResponse = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/sales'),
      );
      await cart.getByRole('button', { name: 'Complete cash / credit sale', exact: true }).click();
      const response = await saleResponse;
      expect(response.status()).toBe(201);
      const receipt = await response.json();
      expect(receipt.sale.totalMinor).toBe('1375');
      expect(receipt.sale.changeMinor).toBe('125');
      await expect(cart.getByText(/Sale completed:/)).toBeVisible();
      const stored = await context.request.get(
        `http://127.0.0.1:3191/api/v1/businesses/${developmentIds.business}/sales/${receipt.sale.id}/receipt`,
      );
      expect(stored.status()).toBe(200);
      expect((await stored.json()).sale.id).toBe(receipt.sale.id);
      results.push({
        account,
        saleId: receipt.sale.id,
        totalMinor: '1375',
        changeMinor: '125',
        receipt: 'server-confirmed',
      });
    } else await cart.getByRole('button', { name: 'Remove line 1' }).click();
    expect(errors).toEqual([]);
    results.push({ account, cartSurvivesOverviewAndInventory: true, errors });
    await page.screenshot({ path: `docs/qa/feature-audit/${account}-cart.png` });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile('docs/qa/feature-audit/checkout.json', JSON.stringify(results, null, 2) + '\n');
}
console.log('Cart retention, server-confirmed cash checkout and receipt passed.');
