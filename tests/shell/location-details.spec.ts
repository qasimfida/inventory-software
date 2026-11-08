import { expect, test } from '@playwright/test';

test('location cards open a readable, authorized drawer at narrow and desktop widths', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.evaluate(() => {
    location.hash = '/settings/locations';
  });
  const collection = page.getByRole('region', { name: 'Stores warehouses and terminals' });
  await expect(collection).toBeVisible();
  await collection.getByRole('tab', { name: 'locations grid view' }).click();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const card = collection.locator('article').first();
    await expect(card).toBeVisible();
    await card.getByRole('button').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByLabel('Location details')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Edit details' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/qa/location-details-${width}.png`,
      animations: 'disabled',
      timeout: 10000,
    });
    await drawer.getByRole('button', { name: /^Close / }).click();
  }
  expect(errors).toEqual([]);
});
