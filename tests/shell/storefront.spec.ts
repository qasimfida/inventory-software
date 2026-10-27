import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('storefront foundation is permission gated, responsive and safely demonstrates local forms', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/storefront';
  });
  await expect(page.getByText('Image origin is not trusted', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'publish listing', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/storefront-ui-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Configure online store', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Public store name', exact: true })).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Public store name', exact: true }),
  ).not.toHaveValue('');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('textbox', { name: 'Public store name', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 720 });
  await chooseSelect(page, 'Role', 'manager');
  await page.evaluate(() => {
    location.hash = '/storefront';
  });
  await expect(page.getByRole('region', { name: 'Online store foundation' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Configure online store', exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
  await chooseSelect(page, 'Role', 'owner');
  await page.evaluate(() => {
    location.hash = '/storefront';
  });
  await expect(
    page.getByRole('button', { name: 'Configure online store', exact: true }),
  ).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText(/Last loaded data is read-only/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Configure online store', exact: true }),
  ).toHaveCount(0);
  await page.context().setOffline(false);
  await page.setViewportSize({ width: 1280, height: 720 });
  await chooseSelect(page, 'Role', 'cashier');
  await expect(page.getByRole('button', { name: 'Switch workspace', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Switch workspace', exact: true }).locator('.profile-chevron'),
  ).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/storefront';
  });
  await expect(page.getByRole('region', { name: 'Online store foundation' })).toHaveCount(0);
});
