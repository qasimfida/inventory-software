import { expect } from '@playwright/test';
export async function exercisePricing(page) {
  await page.getByRole('button', { name: 'Edit product Browser product', exact: true }).click();
  await page.getByLabel('Product status', { exact: true }).selectOption('active');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await page
    .getByRole('button', { name: 'Variants and pricing for Browser product', exact: true })
    .click();
  await page.getByLabel('Base-unit selling price', { exact: true }).fill('12.50');
  await page.getByRole('button', { name: 'Publish price', exact: true }).click();
  await expect(page.getByText(/12.500000 USD/)).toBeVisible();
  await page.getByRole('button', { name: 'Calculate server price', exact: true }).click();
  await expect(page.getByText(/Server price: USD 12.50/)).toBeVisible();
  await page.getByLabel('Promotion name', { exact: true }).fill('Launch offer');
  await page.getByRole('button', { name: 'Publish promotion', exact: true }).click();
  await expect(page.getByText('Launch offer · 10% · priority 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Calculate server price', exact: true }).click();
  await expect(page.getByText(/Server price: USD 11.25/)).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw promotion', exact: true }).click();
  await page.getByRole('button', { name: 'Calculate server price', exact: true }).click();
  await expect(page.getByText(/Server price: USD 12.50/)).toBeVisible();
  console.log(
    'PASS real browser price publication, exact quote, percentage promotion and withdrawal',
  );
}
