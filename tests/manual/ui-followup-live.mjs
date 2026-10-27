/* global location */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email').fill('admin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill('asdF@123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open profile menu' })).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().includes('/pos/items') && r.status() === 200,
  );
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  const items = (await (await response).json()).items;
  expect(items.length).toBeGreaterThan(0);
  await expect(page.locator('.product-card')).toHaveCount(items.length);
  expect(items.some((item) => item.price === null)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa/ui-followup/live-pos.png', fullPage: true });
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeVisible();
  expect(errors).toEqual([]);
  await writeFile(
    'artifacts/qa/ui-followup/live-results.json',
    JSON.stringify(
      {
        source: 'local PostgreSQL API',
        products: items.length,
        unpriced: items.filter((i) => !i.price).length,
        errors,
        checks: ['login', 'POS products', 'Settings shortcut', 'logout'],
        businessMutations: false,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
