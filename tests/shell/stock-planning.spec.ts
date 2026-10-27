import { test, expect } from '@playwright/test';
test('inventory planning renders real components and bounded management forms at wide and narrow widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await page.getByRole('button', { name: 'Reorder policies and order holds', exact: true }).click();
  await expect(page.getByText('DEMO-ORDER-001', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save reorder policy', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'artifacts/qa/screens/milestone-3/stock-planning-web.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Create order stock hold', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Unique order reference');
  await expect
    .poll(async () =>
      Math.round(
        (await page.getByRole('dialog').boundingBox())!.x +
          (await page.getByRole('dialog').boundingBox())!.width,
      ),
    )
    .toBeLessThanOrEqual(390);
  await page.screenshot({
    path: 'artifacts/qa/screens/milestone-3/stock-planning-narrow.png',
    fullPage: false,
    animations: 'disabled',
  });
});
