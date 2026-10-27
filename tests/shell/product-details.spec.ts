import { test, expect } from '@playwright/test';
test('catalog detail tabs show product-scoped data and honest channels at desktop and narrow widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await page
    .getByRole('button', { name: 'View details for Oak dining chair · Natural 1', exact: true })
    .first()
    .click();
  await page.getByRole('link', { name: 'Open full product details' }).click();
  const detail = page.getByRole('region', { name: 'Product detail', exact: true });
  await expect(detail.getByRole('heading', { name: 'Oak dining chair · Natural 1' })).toBeVisible();
  await detail.getByRole('tab', { name: 'Stock', exact: true }).click();
  await expect(detail.getByRole('table')).toContainText('HP-001');
  await expect(detail.getByRole('table')).not.toContainText('HP-002');
  await page.screenshot({ path: 'artifacts/qa/screens/milestone-3/web-stock.png', fullPage: true });
  await detail.getByRole('tab', { name: 'History' }).click();
  await expect(detail).toContainText('Demonstration opening balance');
  await detail.getByRole('tab', { name: 'Pricing' }).click();
  await expect(detail).toContainText('HP-001');
  await detail.getByRole('tab', { name: 'Channels' }).click();
  await expect(detail).toContainText('storefront publishing has not been implemented');
  await page.setViewportSize({ width: 390, height: 844 });
  await detail.getByRole('tab', { name: 'Overview' }).click();
  await expect(detail.getByRole('button', { name: 'Edit product details' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({
    path: 'artifacts/qa/screens/milestone-3/web-overview-narrow.png',
    fullPage: true,
  });
});
