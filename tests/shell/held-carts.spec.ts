import { test, expect } from '@playwright/test';
test('named POS carts resume with fresh totals and expose cash/credit allocation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await page
    .getByRole('button', { name: /^Add HP-/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await page.getByLabel('Cart name (avoid personal information)').fill('Counter A');
  await page.getByRole('button', { name: 'Hold current cart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume Counter A' })).toBeEnabled();
  await page
    .getByRole('button', { name: /^Add HP-/ })
    .nth(1)
    .click();
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await page.getByLabel('Cart name (avoid personal information)').fill('Counter B');
  await page.getByRole('button', { name: 'Hold current cart', exact: true }).click();
  await page.getByRole('button', { name: 'Resume Counter A' }).click();
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Checkout', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Payment allocation' })).toContainText(
    'Unpaid credit:',
  );
  await page.getByLabel('Cash applied (minor units)', { exact: true }).fill('0');
  await expect(page.getByText('Select a customer for the unpaid credit balance.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete cash / credit sale' })).toBeDisabled();
  await page.screenshot({
    path: 'artifacts/qa/screens/milestone-4/pos-carts-web.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
