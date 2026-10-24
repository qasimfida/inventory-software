/* global location */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const out = 'docs/qa/cart-role-fixes';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const evidence = { cart: false, hiddenSettings: false, ownerSettings: false, errors: [] };
async function login(email) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => evidence.errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  return page;
}
try {
  const page = await login('cashier@inv.com');
  await expect(page).toHaveURL(/#\/pos/);
  for (const path of ['business', 'company', 'locations'])
    await expect(page.locator(`.sidebar-navigation a[href="#/settings/${path}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Open profile menu', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Business settings', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Business', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Company profile', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Preferences', exact: true })).toBeVisible();
  await page.screenshot({ path: `${out}/cashier-settings.png` });
  await page.evaluate(() => {
    location.hash = '/settings/business';
  });
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Business settings' })).toHaveCount(0);
  evidence.hiddenSettings = true;
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await page.getByRole('combobox', { name: 'POS product search', exact: true }).fill('SHOW-BAG');
  const add = page.getByRole('button', { name: 'Add SHOW-BAG · Canvas market bag', exact: true });
  for (let quantity = 1; quantity <= 3; quantity++) {
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page.locator('.cart-line')).toHaveCount(1);
    await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue(String(quantity));
    await expect(page.locator('.checkout-totals')).toBeVisible();
  }
  evidence.cart = true;
  await page.screenshot({ path: `${out}/cashier-cart.png` });
  const owner = await login('owner@inv.com');
  await expect(owner.locator('.sidebar-navigation a[href="#/settings/business"]')).toBeVisible();
  await owner.getByRole('button', { name: 'Open profile menu', exact: true }).click();
  await expect(
    owner.getByRole('menuitem', { name: 'Business settings', exact: true }),
  ).toBeVisible();
  evidence.ownerSettings = true;
  expect(evidence.errors).toEqual([]);
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
