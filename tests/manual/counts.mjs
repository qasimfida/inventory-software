import { expect } from '@playwright/test';
export async function exerciseCounts(page, productId) {
  await page.getByRole('button', { name: 'Offline test · active · owner', exact: true }).click();
  await page
    .getByRole('button', { name: 'Stock counts / warehouse scanning', exact: true })
    .click();
  await page.getByLabel('Product barcode, SKU or variant ID', { exact: true }).fill('OFFLINE');
  await page.getByRole('button', { name: 'Resolve product scan', exact: true }).click();
  await expect(page.getByText(`Offline item · ${productId}`, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Add selected product to new count scope', exact: true })
    .click();
  await page.getByRole('button', { name: 'Create blind count', exact: true }).click();
  await expect(page.getByText(/counted not counted; expected hidden/)).toBeVisible();
  await page.getByLabel('Absolute counted quantity', { exact: true }).fill('9');
  await page
    .getByRole('button', { name: 'Save / replace selected count line', exact: true })
    .click();
  await expect(page.getByText(/counted 9.000000; expected hidden/)).toBeVisible();
  await page
    .getByLabel('Count review reason (minimum 10 characters)', { exact: true })
    .fill('Browser controlled count');
  await page.getByRole('button', { name: 'Submit complete count for review', exact: true }).click();
  await expect(page.getByText(/counted 9.000000; expected 9.000000/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Owner: approve reviewed adjustments', exact: true })
    .click();
  await expect(page.getByText(/Count .* · approved · version/)).toBeVisible();
  console.log('PASS browser scanned blind count capture, review and owner approval');
}
