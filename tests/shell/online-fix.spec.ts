import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('catalog fix returns to publication without silently publishing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await chooseSelect(page, 'Scenario', 'store-live');
  await page.evaluate(() => {
    location.hash = '/online-store/products?tab=changes-required';
  });
  await page
    .getByRole('button', { name: /errors, .*warnings/ })
    .first()
    .hover();
  await page.getByRole('button', { name: 'Fix title', exact: true }).first().click();
  await expect(page.getByRole('textbox', { name: 'Product name', exact: true })).toBeFocused();
  await page
    .getByRole('textbox', { name: 'Product name', exact: true })
    .fill('Repaired online product');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Product results' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  await page.getByRole('tab', { name: /Ready to publish/ }).click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Repaired online product', exact: true }) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Published and confirmed by the server.');
  await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  await page.getByRole('tab', { name: /Active/ }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Paused and hidden from sale.');
});
