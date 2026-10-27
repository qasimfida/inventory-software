import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('online products tabs, details, remove/picker, history, offline and role controls', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/online-store/settings/general';
  });
  await page.getByRole('switch', { name: 'Enable online store', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm enable', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/online-store/products';
  });
  await expect(page.getByRole('heading', { name: 'Online products', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Active/ })).toHaveAttribute('data-state', 'active');
  await expect(page.getByRole('cell', { name: /\$/ }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Ready to publish/ }).click();
  await expect(page.getByRole('button', { name: 'Publish', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Publish', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Successful products 1');
  await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  await page.getByRole('tab', { name: /Active/ }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).first().click();
  await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Ready to publish/ }).click();
  await page.getByRole('button', { name: 'Edit online details', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Online product details');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Edit online details', exact: true })
    .click();
  await page.getByRole('textbox', { name: /Online title/ }).fill('Edited online title');
  await page.getByRole('button', { name: 'Save online details', exact: true }).click();
  await expect(page.getByText('Saved and confirmed by the server.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close Online product details', exact: true }).click();
  await page.getByRole('tab', { name: /Changes required/ }).click();
  await page
    .getByRole('button', { name: /errors, .*warnings/ })
    .first()
    .hover();
  await expect(page.getByRole('button', { name: /Fix / }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'View history', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Latest 200 events');
  await page.getByRole('button', { name: 'Close Listing history', exact: true }).click();
  await page.getByRole('button', { name: 'Remove from store', exact: true }).first().click();
  await page.getByRole('button', { name: 'Confirm removal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Product results');
  await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  await page.getByRole('button', { name: 'Add products', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Add online products');
  await expect(page.getByRole('checkbox').filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `/tmp/online-products-${width}.png`, fullPage: true });
  }
  await page.context().setOffline(true);
  await expect(
    page.getByText('Offline. Last loaded data is read-only.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add products', exact: true })).toBeDisabled();
  await page.context().setOffline(false);
  await chooseSelect(page, 'Role', 'manager');
  await page.evaluate(() => {
    location.hash = '/online-store/products';
  });
  await expect(page.getByRole('heading', { name: 'Online products', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add products', exact: true })).toHaveCount(0);
  await chooseSelect(page, 'Role', 'cashier');
  await page.evaluate(() => {
    location.hash = '/online-store/products';
  });
  await expect(page.getByRole('heading', { name: 'Online products', exact: true })).toHaveCount(0);
});
