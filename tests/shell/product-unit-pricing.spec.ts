import { test, expect } from '@playwright/test';
test('product editor exposes contextual units, pricing and image controls at desktop and phone widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await page
    .locator('.product-card-link')
    .first()
    .click({ position: { x: 40, y: 90 } });
  await page.getByRole('button', { name: 'Edit product details and pricing' }).click();
  await page.getByRole('button', { name: 'Images and product codes', exact: true }).click();
  await expect(page.getByLabel('Image HTTPS URL', { exact: true })).toBeVisible();
  await page.getByText('Price & units', { exact: true }).click();
  await page.getByRole('button', { name: 'Units and packaging', exact: true }).click();
  await expect(page.getByText('Quantity precision is fixed', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Variants', exact: true }).click();
  await expect(page.getByLabel('New variant measurement type')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/qa/product-unit-pricing/mobile-width.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'artifacts/qa/product-unit-pricing/desktop-width.png' });
});
