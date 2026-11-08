import { expect, test } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('creates a product, saves one price and posts quantity inside the same drawer', async ({
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
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Setup test cup');
  await page.getByLabel('SKU', { exact: true }).fill('SETUP-CUP');
  await page.getByRole('button', { name: 'Save details & continue', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Finish product setup' })).toBeVisible();
  await page.getByLabel('Base-unit selling price', { exact: true }).fill('15.50');
  await page.getByRole('button', { name: 'Save selling price', exact: true }).click();
  await expect(
    page.getByText('Selling price saved. You can continue to Quantity or finish setup.'),
  ).toBeVisible();
  await page.getByText('Quantity', { exact: true }).click();
  await page.getByLabel('Opening quantity (base units)', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Save opening quantity', exact: true }).click();
  await expect(page.getByText('Quantity saved. The stock movement is recorded.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save opening quantity', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Search products', exact: true }).fill('SETUP-CUP');
  await page.getByRole('button', { name: 'Actions for SETUP-CUP', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit product', exact: true }).click();
  await page.getByText('Quantity', { exact: true }).click();
  await chooseSelect(page, 'Quantity change', 'adjustment_out');
  await page.getByLabel('Quantity to add or remove (base units)', { exact: true }).fill('2');
  await page.getByLabel('Reason', { exact: true }).fill('Count correction');
  await page.getByRole('button', { name: 'Save quantity change', exact: true }).click();
  await expect(page.getByText('Quantity saved. The stock movement is recorded.')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await chooseSelect(page, 'Role', 'cashier');
  await expect(page.getByRole('button', { name: 'New product', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
