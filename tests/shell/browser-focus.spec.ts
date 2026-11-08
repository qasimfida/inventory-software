import { expect, test } from '@playwright/test';
test('returning to an unchanged browser session preserves its open drawer and unsaved draft', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  const input = page.getByLabel('Product name', { exact: true });
  await input.fill('Unsaved focus regression');
  await input.evaluate((element) => element.setAttribute('data-focus-probe', 'original'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(input).toHaveValue('Unsaved focus regression');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(input).toHaveValue('Unsaved focus regression');
  await expect(input).toHaveAttribute('data-focus-probe', 'original');
  await expect(page.getByRole('dialog', { name: 'Add product', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/inventory/);
  await expect(page.getByText('Checking saved session…', { exact: true })).toHaveCount(0);
});
