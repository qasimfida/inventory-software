/* global location */
import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import {
  developmentPassword,
  developmentIds as ids,
} from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const result = { checks: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await context.newPage();
  page.on('pageerror', (e) => result.errors.push(e.message));
  await page.goto('http://127.0.0.1:5191');
  await page.getByLabel('Account email', { exact: true }).fill('admin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.evaluate(() => (location.hash = '/settings/business'));
  const memberships = (
    await (await context.request.get('http://127.0.0.1:3191/api/v1/businesses')).json()
  ).businesses;
  const main = memberships.find((b) => b.id === ids.business);
  await page.getByRole('combobox', { name: 'Active business', exact: true }).click();
  await page
    .getByRole('option', { name: `${main.name} · ${main.role} · ${main.state}`, exact: true })
    .click();
  const root = `http://127.0.0.1:3191/api/v1/businesses/${ids.business}`;
  const workspace = await (await context.request.get(root)).json();
  const product = (await (await context.request.get(root + '/products?search=SHOW-NOTE')).json())
    .items[0];
  const variant = (
    await (await context.request.get(root + `/products/${product.id}/pricing`)).json()
  ).variants[0];
  const destination = workspace.locations.find(
    (l) => l.kind === 'warehouses' && l.id !== ids.warehouse && l.state === 'active',
  );
  const reference = `UI-MOVE-${Date.now()}`;
  const create = await context.request.post(root + '/transfers', {
    headers: { origin: 'http://127.0.0.1:5191', 'x-inventory-client': 'web' },
    data: {
      sourceWarehouseId: ids.warehouse,
      destinationWarehouseId: destination.id,
      reference,
      lines: [{ variantId: variant.id, unitId: variant.baseUnitId, quantity: '1' }],
      idempotencyKey: randomUUID(),
    },
  });
  expect(create.status()).toBe(201);
  result.transferReference = reference;
  await page.evaluate(() => (location.hash = '/transfers'));
  await page.getByRole('button', { name: /^Transfer warehouse/ }).click();
  await page.getByRole('combobox', { name: 'Transfer warehouse', exact: true }).click();
  await page
    .getByRole('option', {
      name: workspace.locations.find((l) => l.id === ids.warehouse).name,
      exact: true,
    })
    .click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('combobox', { name: 'Search transfer reference / item', exact: true })
    .fill(reference);
  await page.getByRole('button', { name: reference, exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Transfer details', exact: true })).toBeVisible();
  for (const action of ['approve', 'dispatch']) {
    const label = `${action} transfer ${reference}`;
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByLabel('Transfer transition reason').fill('Local UX workflow verification');
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/transition'),
    );
    await page.getByRole('button', { name: label, exact: true }).last().click();
    expect((await response).ok()).toBe(true);
  }
  await page.getByRole('button', { name: 'Confirm destination receipt', exact: true }).click();
  await page.getByLabel('Good received (base units)').fill('1');
  await page.getByLabel('Receipt / discrepancy reason').fill('Local UX destination receipt');
  const received = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/receipts'),
  );
  await page
    .getByRole('button', { name: 'Confirm destination receipt', exact: true })
    .last()
    .click();
  expect((await received).ok()).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Transfer details', exact: true })).toContainText(
    'completed',
  );
  await page.screenshot({ path: 'artifacts/qa/management-ux/transfer-complete.png' });
  result.checks.push('Real transfer draft → approve → dispatch → receive using detail drawer');
  await page.getByRole('button', { name: 'Close Transfer details', exact: true }).click();
  for (const id of [ids.warehouse, destination.id])
    expect(
      (await (await context.request.get(root + `/warehouses/${id}/reconciliation`)).json())
        .consistent,
    ).toBe(true);
  result.checks.push('Source and destination ledger projections reconcile');
  await page.evaluate(() => (location.hash = '/sales'));
  await page.getByRole('button', { name: /^Warehouse/ }).click();
  await page.getByRole('combobox', { name: 'Warehouse', exact: true }).click();
  await page
    .getByRole('option', {
      name: workspace.locations.find((l) => l.id === ids.warehouse).name,
      exact: true,
    })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('table').locator('tbody th button').first().click();
  await expect(page.getByRole('dialog', { name: 'Sale receipt', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Print / reprint receipt', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/qa/management-ux/receipt-details.png' });
  result.checks.push('Real sale history → receipt detail with print and authorized corrections');
  expect(result.errors).toEqual([]);
} finally {
  await browser.close();
  await writeFile('artifacts/qa/management-ux/records.json', JSON.stringify(result, null, 2));
}
