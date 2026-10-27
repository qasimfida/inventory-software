import { test, expect } from '@playwright/test';
test('online collection uses compact controls, select-all, issue help, grid and drawer', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/online-store/products?tab=changes-required';
  });
  const all = page.getByRole('checkbox', { name: 'Select all products on this page' });
  await expect(all).toBeVisible();
  await all.check();
  await expect(page.getByRole('checkbox', { name: /^Select Demo/ }).first()).toBeChecked();
  await all.uncheck();
  const issue = page.getByRole('button', { name: /errors, .*warnings/ }).first();
  await issue.hover();
  await expect(page.getByRole('dialog', { name: 'Product issues' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Fix / }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Online products grid view' }).click();
  await expect(page.locator('#online-collection article').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Online products list view' }).click();
  await expect(page.getByRole('columnheader', { name: 'Product', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add products', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Add online products' });
  await expect(drawer).toHaveClass(/form-drawer/);
  await expect(drawer.getByRole('button', { name: 'Add 0 selected products' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close Add online products', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Configure store' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View all steps' })).toHaveCount(0);
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({
      path: `artifacts/qa/screens/online-store/refinement-overview-${width}.png`,
      fullPage: true,
    });
  }
});
