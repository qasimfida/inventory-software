import { test, expect } from '@playwright/test';
test('operational toolbars preserve lists and fit desktop and phone screens', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['categories', 'customers', 'transfers', 'payables', 'sales']) {
      await page.evaluate((path) => {
        location.hash = '/' + path;
      }, route);
      if (route === 'categories') {
        await expect(page.getByRole('button', { name: 'Add category', exact: true })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Category status filter' })).toBeVisible();
      }
      if (route === 'customers')
        await expect(page.getByRole('button', { name: 'Add customer', exact: true })).toBeVisible();
      if (route === 'transfers')
        await expect(
          page.getByRole('button', { name: 'Create transfer draft', exact: true }),
        ).toBeVisible();
      if (route === 'payables')
        await expect(page.getByRole('combobox', { name: 'Supplier balances store' })).toBeVisible();
      if (route === 'sales') {
        await expect(page.getByRole('region', { name: 'receipts list view' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /receipts grid/ })).toHaveCount(0);
      }
      await page.screenshot({ path: `artifacts/qa/phase4-toolbars/${route}-${width}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  }
});
