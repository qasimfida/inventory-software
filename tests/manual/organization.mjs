import { exerciseCommerce } from './commerce.mjs';
import { exerciseCustomers } from './customers.mjs';
import { exercisePurchasing } from './purchasing.mjs';
import { exerciseStorage } from './storage.mjs';
import { exerciseTransfers } from './transfers.mjs';
import { exerciseInventory } from './inventory.mjs';
import { exercisePricing } from './pricing.mjs';
import { exerciseCatalog } from './catalog.mjs';
/* global window, document */
// Run against disposable migrated API/web servers. Supply E2E_WEB_URL and E2E_INVITATION.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const email = 'browser-e2e@example.test';
const password = 'correct horse battery staple';
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => console.error('Browser exception', error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.log('HTTP', response.status(), new URL(response.url()).pathname);
  });
  await page.goto(process.env.E2E_WEB_URL);
  await page.getByRole('button', { name: 'I have an invitation', exact: true }).click();
  await page.getByLabel('Account email', { exact: true }).fill(email);
  await page.getByLabel('Password (15–128 characters)', { exact: true }).fill(password);
  await page.getByLabel('Invitation code', { exact: true }).fill(process.env.E2E_INVITATION);
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  await page.getByLabel('New business name', { exact: true }).fill('Browser business');
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Locations and devices' })).toBeVisible();
  await exerciseCatalog(page);
  async function createLocation(kind, name, code, parent, warehouse) {
    await page.getByLabel('Entity', { exact: true }).selectOption(kind);
    await page.getByLabel('Location or terminal name', { exact: true }).fill(name);
    await page
      .getByLabel('Code (letters, numbers, underscore or hyphen)', { exact: true })
      .fill(code);
    if (parent)
      await page.getByLabel('Parent store', { exact: true }).selectOption({ label: parent });
    if (warehouse)
      await page
        .getByLabel('Warehouse (optional)', { exact: true })
        .selectOption({ label: warehouse });
    await page.getByRole('button', { name: 'Create location', exact: true }).click();
    await expect(page.getByRole('button', { name: `Edit ${name}`, exact: true })).toBeVisible();
  }
  await createLocation('stores', 'Main branch', 'MAIN');
  await exercisePricing(page);
  await createLocation('warehouses', 'Main warehouse', 'WH', 'Main branch');
  await exerciseInventory(page);
  await exercisePurchasing(page);
  await exerciseStorage(page);
  await exerciseTransfers(page);
  await exerciseCustomers(page);
  await createLocation('terminals', 'Till one', 'POS', 'Main branch', 'Main warehouse');
  await exerciseCommerce(page);
  await page.getByRole('button', { name: 'Edit Till one', exact: true }).click();
  await page.getByLabel('Location state', { exact: true }).selectOption('suspended');
  await page.getByRole('button', { name: 'Save location', exact: true }).click();
  await expect(page.getByText(/Till one · POS · pos · suspended/)).toBeVisible();
  await page.getByRole('button', { name: 'View audit history', exact: true }).click();
  await expect(page.getByText(/terminals.updated/)).toBeVisible();
  await page.evaluate(axe.source);
  const accessibility = await page.evaluate(async () =>
    (
      await window.axe.run(document.querySelector('[aria-label="Organization management"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    ).violations.map((item) => item.id),
  );
  assert.deepEqual(accessibility, []);
  await page.getByLabel('Business name', { exact: true }).fill('Renamed business');
  await page.getByRole('button', { name: 'Save business', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Renamed business', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Renamed business', exact: true })).toHaveCount(0);
  await context.close();
  console.log(
    'PASS real API/browser organization CRUD, parent selections, suspension, audit, logout clearing and axe WCAG checks',
  );
  const desktop = await browser.newContext();
  await desktop.addInitScript(() =>
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {} }),
  );
  const native = await desktop.newPage();
  await native.goto(process.env.E2E_WEB_URL);
  await native.getByLabel('Account email', { exact: true }).fill(email);
  await native.getByLabel('Password', { exact: true }).fill(password);
  await native.getByRole('button', { name: 'Log in', exact: true }).click();
  await native
    .getByRole('button', { name: 'Renamed business · active · owner', exact: true })
    .click();
  await expect(native.getByText(/Till one · POS · pos · suspended/)).toBeVisible();
  assert.equal((await desktop.cookies()).length, 0);
  await native.reload();
  await expect(native.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await expect(native.getByText(/Till one · POS/)).toHaveCount(0);
  await desktop.close();
  console.log(
    'PASS simulated desktop bearer management and reload clearing (not a native WebView test)',
  );
} finally {
  await browser.close();
}
