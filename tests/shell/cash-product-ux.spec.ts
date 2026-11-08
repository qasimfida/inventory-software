import { test, expect } from '@playwright/test';
test('product card surface opens details and warehouse options open directly', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  const card = page.locator('.product-card-link').first();
  await expect(card).toBeVisible();
  await card.click({ position: { x: 40, y: 90 } });
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });
  const warehouse = page.getByRole('combobox', { name: 'Workspace warehouse' });
  if ((await warehouse.count()) && (await warehouse.isEnabled())) {
    await warehouse.click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.evaluate(() => {
    location.hash = '/cash';
  });
  await expect(page.getByRole('combobox', { name: 'Search cash shifts' })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByLabel('Status', { exact: true })).toBeVisible();
});
