import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('online setup saves, confirms enablement, guards drafts, and exposes scoped settings on responsive clients', async ({
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
  await expect(page.getByRole('heading', { name: 'Online store settings' })).toBeVisible();
  await page.getByRole('switch', { name: 'Enable online store', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Only products explicitly published');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Enable online store', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('switch', { name: 'Enable online store', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm enable', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Enable online store', exact: true }),
  ).toBeChecked();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Online store', exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Store name', exact: true }).fill('Edited online name');
  await page.getByRole('link', { name: 'Catalog & pricing', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Discard unsaved settings');
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByText('Changes saved and confirmed by the server.')).toBeVisible();
  await page.getByRole('button', { name: 'Fulfillment & payments', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Pickup', exact: true })).toBeDisabled();
  await page.getByRole('switch', { name: 'Cash on delivery', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Pickup', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Policies', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Shipping policy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await page.getByRole('button', { name: 'Image sources', exact: true }).click();
  await page.getByRole('button', { name: 'Remove images.example.com', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('36 listings');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('textbox', { name: 'Allowed image host', exact: true }).fill('127.0.0.1');
  await page.getByRole('button', { name: 'Add image host', exact: true }).click();
  await expect(page.getByText('Use an exact public DNS hostname', { exact: false })).toBeVisible();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `/tmp/online-store-settings-${width}.png`, fullPage: true });
  }
  await page.context().setOffline(true);
  await expect(page.getByText('Offline. Last loaded settings are read-only.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add image host', exact: true })).toBeDisabled();
  await page.context().setOffline(false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await chooseSelect(page, 'Role', 'manager');
  await page.evaluate(() => {
    location.hash = '/online-store/settings/general';
  });
  await expect(page.getByRole('textbox', { name: 'Store name', exact: true })).toBeDisabled();
  await chooseSelect(page, 'Role', 'cashier');
  await page.evaluate(() => {
    location.hash = '/online-store';
  });
  await expect(page.getByRole('region', { name: 'Online store setup' })).toHaveCount(0);
});
