import { expect, test } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('inventory includes product management and stock with role-safe legacy access', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await expect(page.getByRole('heading', { name: 'Products & pricing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Catalog & pricing', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /^Actions for / })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Variants and pricing', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Variants and pricing' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Stock & movements', { exact: true }).check({ force: true });
  await expect(
    page.getByText('Stock operations and movement history', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Products & pricing', { exact: true }).check({ force: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
  }
  await page.evaluate(() => {
    location.hash = '/inventory?stock=low-stock';
  });
  await expect(
    page.getByText('Stock operations and movement history', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await expect(page.getByRole('heading', { name: 'Products & pricing' })).toBeVisible();
  await chooseSelect(page, 'Role', 'cashier');
  await expect(page.getByRole('button', { name: 'New product', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
