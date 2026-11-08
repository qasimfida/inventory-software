import { expect, test } from '@playwright/test';
test('sold-out product cannot be added from POS card, search or details', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Sold out test');
  await page.getByLabel('SKU', { exact: true }).fill('SOLD-TEST');
  await page.getByRole('button', { name: 'Save details & continue', exact: true }).click();
  await page.getByLabel('Base-unit selling price', { exact: true }).fill('12.50');
  await page.getByRole('button', { name: 'Save selling price', exact: true }).click();
  await expect(
    page.getByText('Selling price saved. You can continue to Quantity or finish setup.'),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  const search = page.getByRole('combobox', { name: 'POS product search' });
  await search.fill('SOLD-TEST');
  const sold = page.getByRole('button', { name: 'Sold SOLD-TEST · Sold out test', exact: true });
  await expect(sold).toBeDisabled();
  await expect(sold).toHaveText('Sold');
  await page.getByRole('option', { name: /Sold out test.*Sold/ }).click();
  await expect(page.getByText('Your cart is empty.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Sold out test', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Sold', exact: true }),
  ).toBeDisabled();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});
