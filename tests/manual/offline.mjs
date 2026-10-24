import { exerciseCounts } from './counts.mjs';
/* global window, document */
import { chromium, expect as baseExpect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import axe from 'axe-core';
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.VITE_API_BASE_URL + '/api/v1',
  email = 'browser-e2e@example.test',
  password = 'correct horse battery staple';
let token = '';
async function api(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-inventory-client': 'native',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok, `${path}: ${response.status}`);
  return response.json();
}
const account = await api('/auth/invitations/accept', {
  email,
  password,
  invitationToken: process.env.E2E_INVITATION,
});
token = account.token;
const business = await api('/businesses', { name: 'Offline test' }),
  path = '/businesses/' + business.id;
const store = await api(path + '/locations', {
    kind: 'stores',
    name: 'Shop',
    code: 'SHOP',
    type: 'store',
  }),
  warehouse = await api(path + '/locations', {
    kind: 'warehouses',
    name: 'Warehouse',
    code: 'WH',
    storeId: store.id,
  }),
  terminal = await api(path + '/locations', {
    kind: 'terminals',
    name: 'Register',
    code: 'POS',
    type: 'pos',
    storeId: store.id,
    warehouseId: warehouse.id,
  });
const product = await api(path + '/products', { name: 'Offline item', sku: 'OFFLINE' }),
  pricing = await api(path + `/products/${product.id}/pricing`),
  unitId = pricing.variants[0].baseUnitId;
await api(path + '/prices', {
  variantId: product.id,
  unitPrice: '10',
  currency: 'USD',
  taxBasisPoints: 0,
  taxInclusive: false,
  startsAt: '2026-01-01T00:00:00.000Z',
});
await api(path + '/stock/movements', {
  variantId: product.id,
  unitId,
  warehouseId: warehouse.id,
  type: 'opening',
  quantity: '10',
  reason: 'Offline browser fixture',
  idempotencyKey: randomUUID(),
});
await api(path + '/cash-shifts', {
  warehouseId: warehouse.id,
  terminalId: terminal.id,
  currency: 'USD',
  openingMinor: '0',
  idempotencyKey: randomUUID(),
});
await api(
  path + '/sync/policy',
  {
    enabled: true,
    leaseMinutes: 60,
    maxSaleMinor: '100000',
    maxLeaseMinor: '500000',
    maxDiscountBasisPoints: 0,
    allowCredit: false,
    paymentMethod: 'cash',
    requireCachedStock: true,
    pricePolicy: 'reject_changed',
    maxLineQuantity: '100',
    version: 1,
  },
  'PUT',
);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
try {
  const context = await browser.newContext(),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('Browser console', m.text());
  });
  page.on('requestfailed', (r) => console.log('Request failed', r.url()));
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto(process.env.E2E_WEB_URL);
  await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker did not become ready')), 15000),
      ),
    ]),
  );
  console.log('PASS offline shell installed');
  await page.reload();

  async function login() {
    await page.getByLabel('Account email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  }
  await login();
  async function unlockSavedRegister() {
    await page.getByRole('button', { name: 'Offline cash register', exact: true }).click();
    await page
      .getByLabel('Separate offline passphrase (15–128 characters)')
      .fill('offline separate passphrase');
    await page.getByRole('button', { name: 'Unlock saved register', exact: true }).click();
    await expect(page.getByLabel('Offline product', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Offline cash register', exact: true }).click();
  await page.getByLabel('Business ID for preparation').fill(business.id);
  await page.getByLabel('Warehouse ID for preparation').fill(warehouse.id);
  await page
    .getByLabel('Separate offline passphrase (15–128 characters)')
    .fill('offline separate passphrase');
  await page
    .getByRole('button', { name: 'Prepare new offline register online', exact: true })
    .click();
  await expect(page.getByLabel('Offline product', { exact: true })).toBeVisible();
  await context.setOffline(true);
  // The existing session boundary locks/remounts the register. Unlock its durable vault explicitly.
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await unlockSavedRegister();
  await page.getByLabel('Offline product', { exact: true }).selectOption(product.id);
  await page.getByRole('button', { name: 'Save line to durable cart', exact: true }).click();
  await expect(page.getByText('Total (minor units): 1000', { exact: true })).toBeVisible();
  await page.reload();

  await page.getByRole('button', { name: 'Offline cash register', exact: true }).click();
  await page
    .getByLabel('Separate offline passphrase (15–128 characters)')
    .fill('offline separate passphrase');
  await page.getByRole('button', { name: 'Unlock saved register', exact: true }).click();
  await expect(page.getByText('Total (minor units): 1000', { exact: true })).toBeVisible();
  await page.getByLabel('Cash received (minor units)', { exact: true }).fill('1000');
  await page
    .getByRole('button', { name: 'Confirm received cash and save pending sale', exact: true })
    .click();
  await expect(page.getByText(/· pending ·/)).toBeVisible();
  await page.reload();

  await page.getByRole('button', { name: 'Offline cash register', exact: true }).click();
  await page
    .getByLabel('Separate offline passphrase (15–128 characters)')
    .fill('offline separate passphrase');
  await page.getByRole('button', { name: 'Unlock saved register', exact: true }).click();
  await expect(page.getByText(/· pending ·/)).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      'Pending offline records remain readable without page overflow',
    );
    await page.screenshot({ path: `test-results/offline-pending-${width}.png`, fullPage: true });
  }
  await context.setOffline(false);
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  await unlockSavedRegister();
  let lost = false;
  await page.route('**/sync/upload', async (route) => {
    const response = await route.fetch();
    if (!lost) {
      lost = true;
      await route.abort('failed');
    } else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Synchronize / renew permission', exact: true }).click();
  await expect(page.getByText(/Upload interrupted|Outcome unknown/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Retry same operation', exact: true }).click();
  await page.getByRole('button', { name: 'Synchronize / renew permission', exact: true }).click();
  await expect(page.getByText(/· synced ·/)).toBeVisible();
  assert.ok(lost);
  const history = await api(path + `/sales?warehouseId=${warehouse.id}`);
  assert.equal(history.sales.length, 1);
  await exerciseCounts(page, product.id);
  await page.evaluate(axe.source);
  const violations = await page.evaluate(async () =>
    (
      await window.axe.run(document.querySelector('main'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    ).violations.map((v) => v.id),
  );
  assert.deepEqual(violations, []);
  assert.deepEqual(
    runtimeErrors,
    [],
    'Uncaught exceptions during offline/recovery/count workflows',
  );
  console.log(
    'PASS production web shell airplane-mode reload, durable cart/sale restart, reconnect, lost committed response, same-ID replay, one sale, axe checks',
  );
  await context.close();
} finally {
  await browser.close();
}
