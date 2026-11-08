import { expect, test } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('compact collections, POS details and role-safe menus work at narrow and desktop widths', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Business setup shortcuts' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/categories';
  });
  await expect(page.getByRole('combobox', { name: 'Search categories' })).toBeVisible();
  await page.getByRole('button', { name: /Add category/ }).click();
  await expect(page.getByRole('dialog').getByLabel('Category name')).toBeVisible();
  await page.getByRole('button', { name: 'Close Add category' }).click();
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await expect(page.getByRole('button', { name: 'Use cached products', exact: true })).toHaveCount(
    0,
  );
  const products = page.locator('.pos-products');
  await products.locator('.product-card-title').first().click();
  await expect(page.getByRole('dialog', { name: 'Product details' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Selected unit', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close Product details', exact: true }).click();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/qa/compact-workflows/pos-${width}.png`,
      animations: 'disabled',
    });
  }
  await chooseSelect(page, 'Role', 'cashier');
  await products
    .getByRole('button', { name: /^Actions for / })
    .first()
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'Edit product / manage listing' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
