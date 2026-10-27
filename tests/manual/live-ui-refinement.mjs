/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const base = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5173';
const out = 'artifacts/qa/live-ui-refinement';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const evidence = { roles: [], live: {}, errors: [] };
// Optional: leave the Android development cashier signed in to the same POS warehouse.
async function nativePrice(price) {
  if (!process.env.ANDROID_ADB) return;
  const adb = (args) => promisify(execFile)(process.env.ANDROID_ADB, args);
  await expect(async () => {
    await adb(['shell', 'uiautomator', 'dump', '/sdcard/live-price.xml']);
    const { stdout } = await adb(['shell', 'cat', '/sdcard/live-price.xml']);
    expect(stdout).toContain(`text="$${Number(price).toFixed(2)}"`);
  }).toPass({ timeout: 20000 });
  evidence.live.android = true;
}
async function login(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => evidence.errors.push({ email, message: error.message }));
  await page.goto(base);
  await page.getByLabel('Account email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.locator('.sidebar-navigation a').first()).toBeVisible();
  return { context, page };
}
async function navigate(page, path) {
  await page.evaluate((value) => {
    location.hash = value;
  }, path);
}
async function retail(page) {
  await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
  await page.locator('.workspace-option').filter({ hasText: 'Local Development Business' }).click();
  await expect(page.locator('.workspace-copy')).toContainText('Local Development Business');
  await expect(page).toHaveURL(/#\/dashboard/);
  await page.waitForTimeout(300);
}
async function get(context, path) {
  const response = await context.request.get(base + '/api/v1' + path);
  expect(response.status()).toBe(200);
  return response.json();
}
async function post(context, path, data) {
  const response = await context.request.post(base + '/api/v1' + path, {
    data,
    headers: { origin: base, 'x-inventory-client': 'web' },
  });
  expect(response.status()).toBe(201);
  return response.json();
}
try {
  const owner = await login('owner@inv.com');
  await retail(owner.page);
  const cashier = await login('cashier@inv.com');
  await expect(cashier.page).toHaveURL(/#\/pos/);
  expect(await cashier.page.locator('.sidebar-navigation a[href="#/dashboard"]').count()).toBe(0);
  expect(
    await cashier.page
      .locator('main')
      .getByRole('combobox', { name: /warehouse/i })
      .count(),
  ).toBe(0);
  const businesses = await get(cashier.context, '/businesses');
  const business = businesses.businesses.find((b) => b.name === 'Local Development Business');
  const workspace = await get(cashier.context, `/businesses/${business.id}`);
  const warehouse = workspace.locations.find(
    (l) => l.kind === 'warehouses' && l.state === 'active',
  );
  const items = await get(
    cashier.context,
    `/businesses/${business.id}/pos/items?warehouseId=${warehouse.id}&currency=USD`,
  );
  const item = items.items.find((i) => i.price);
  expect(item).toBeTruthy();
  const pricing = await get(
    owner.context,
    `/businesses/${business.id}/products/${item.id}/pricing`,
  );
  const previous = pricing.prices
    .filter(
      (p) =>
        (!p.storeId || p.storeId === warehouse.storeId) &&
        Date.parse(p.startsAt) <= Date.now() &&
        (!p.endsAt || Date.parse(p.endsAt) > Date.now()),
    )
    .sort(
      (a, b) =>
        Number(!!b.storeId) - Number(!!a.storeId) ||
        Date.parse(b.startsAt) - Date.parse(a.startsAt),
    )[0];
  const root = `/businesses/${business.id}`;
  await cashier.page
    .getByRole('combobox', { name: 'POS product search', exact: true })
    .fill(item.sku);
  const add = cashier.page.getByRole('button', {
    name: `Add ${item.sku} · ${item.name}`,
    exact: true,
  });
  await expect(add).toBeVisible();
  await add.click();
  await expect(cashier.page.locator('.checkout-totals')).toBeVisible();
  await navigate(owner.page, '/inventory');
  await owner.page.getByRole('button', { name: /^Workspace warehouse/ }).click();
  await owner.page.getByRole('combobox', { name: 'Workspace warehouse', exact: true }).click();
  await owner.page.getByRole('option', { name: warehouse.name, exact: true }).click();
  await owner.page.keyboard.press('Escape');
  await owner.page.getByRole('combobox', { name: /Search inventory/ }).fill(item.sku);
  await expect(
    owner.page.getByRole('button', { name: `View ${item.name}`, exact: true }),
  ).toBeVisible();
  const catalog = await owner.context.newPage();
  await catalog.goto(base);
  await expect(catalog.locator('.app-header')).toBeVisible();
  await retail(catalog);
  await navigate(catalog, '/catalog');
  await catalog.getByRole('combobox', { name: 'Search products', exact: true }).fill(item.sku);
  await expect(catalog.locator('.product-card').filter({ hasText: item.sku })).toBeVisible();
  // Use the same store context in every consumer.
  await catalog.getByRole('button', { name: /^Workspace warehouse/ }).click();
  await catalog.getByRole('combobox', { name: 'Workspace warehouse', exact: true }).click();
  await catalog.getByRole('option', { name: warehouse.name, exact: true }).click();
  await catalog.keyboard.press('Escape');
  await catalog.getByRole('combobox', { name: 'Search products', exact: true }).fill(item.sku);
  const changedPrice = Number(previous.unitPrice) === 23.47 ? '24.51' : '23.47';
  evidence.live.previousPrice = previous.unitPrice;
  evidence.live.changedPrice = changedPrice;
  const before = Date.now();
  const publish = (unitPrice) =>
    post(owner.context, `${root}/prices`, {
      variantId: item.id,
      storeId: warehouse.storeId,
      unitPrice,
      currency: previous.currency,
      taxBasisPoints: previous.taxBasisPoints,
      taxInclusive: previous.taxInclusive,
      startsAt: new Date().toISOString(),
      endsAt: null,
      customerId: null,
    });
  try {
    await publish(changedPrice);
    await expect(add).toContainText(changedPrice);
    evidence.live.posLatencyMs = Date.now() - before;
    await expect(cashier.page.locator('.checkout-totals')).toContainText(changedPrice);
    await expect(owner.page.locator('table').first()).toContainText(changedPrice);
    await expect(catalog.locator('.product-card').filter({ hasText: item.sku })).toContainText(
      changedPrice,
    );
    evidence.live = { ...evidence.live, pos: true, cart: true, inventory: true, catalog: true };
    await nativePrice(changedPrice);
    await cashier.page.screenshot({ path: `${out}/cashier-pos.png` });
    await owner.page.screenshot({ path: `${out}/inventory.png` });
  } finally {
    await publish(previous.unitPrice);
    await expect(add).toContainText(Number(previous.unitPrice).toFixed(2));
    await nativePrice(previous.unitPrice);
    evidence.live.restored = true;
  }
  await catalog.close();
  await navigate(owner.page, '/notifications');
  await expect(owner.page.getByRole('combobox', { name: 'Read status' })).toBeVisible();
  await owner.page.getByRole('combobox', { name: 'Read status' }).click();
  expect(await owner.page.getByPlaceholder('Search options…').count()).toBe(0);
  await owner.page.keyboard.press('Escape');
  await owner.page.getByRole('combobox', { name: /Search notification/ }).fill('purchase');
  await owner.page.waitForTimeout(600);
  const notice = owner.page.locator('table tbody th button').first();
  if (await notice.count()) {
    await notice.click();
    await expect(owner.page.getByRole('dialog')).toBeVisible();
    await owner.page.getByRole('button', { name: 'Close Notification details' }).click();
    evidence.notificationDrawer = true;
  }
  await owner.page.screenshot({ path: `${out}/notifications.png` });
  for (const width of [390, 768, 1440]) {
    await owner.page.setViewportSize({ width, height: 1000 });
    expect(await owner.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await owner.context.close();
  await cashier.context.close();
  for (const name of ['admin', 'superadmin', 'manager', 'inventory', 'accountant', 'viewer']) {
    const { page, context } = await login(`${name}@inv.com`);
    evidence.roles.push({
      role: name,
      landing: new URL(page.url()).hash,
      links: await page.locator('.sidebar-navigation a').allTextContents(),
    });
    expect(await page.locator('.sidebar-navigation a[aria-disabled=true]').count()).toBe(0);
    await context.close();
  }
  const invalid = await browser.newContext();
  const page = await invalid.newPage();
  await page.goto(base);
  await page.getByLabel('Account email', { exact: true }).fill('cashier@inv.com');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect');
  expect(await page.getByRole('alert').innerText()).not.toContain('Reference:');
  evidence.invalidCredentials = true;
  await invalid.close();
  expect(evidence.errors).toEqual([]);
} finally {
  evidence.lastPages = await Promise.all(
    browser
      .contexts()
      .flatMap((context) => context.pages())
      .map(async (page) => ({
        url: page.url(),
        main: (
          await page
            .locator('main')
            .innerText()
            .catch(() => '')
        ).slice(0, 500),
      })),
  );
  await writeFile(`${out}/browser.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
