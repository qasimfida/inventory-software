import { expect } from '@playwright/test';
export async function exerciseCatalog(page) {
  await page.getByLabel('Category name', { exact: true }).fill('Browser category');
  await page.getByRole('button', { name: 'Save category', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit category Browser category', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Browser product');
  await page.getByLabel('SKU', { exact: true }).fill('BROWSER-SKU');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Browser category' });
  await page.getByLabel('Barcodes (one per line)', { exact: true }).fill('123456789');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit product Browser product', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Scan or enter barcode / SKU', { exact: true }).fill('123456789');
  await page.getByRole('button', { name: 'Search catalog', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit product Browser product', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit product Browser product', exact: true }).click();
  await page.getByLabel('Product status', { exact: true }).selectOption('inactive');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByText('BROWSER-SKU · inactive · physical', { exact: true })).toBeVisible();
  console.log('PASS real browser category/product creation, barcode lookup and status editing');
}
