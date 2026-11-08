import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('overview trend follows its selected period without a collapsible footer', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const trend = page.getByRole('region', { name: 'Sales trend', exact: true });
  await expect(trend).toBeVisible();
  await expect(trend.locator('circle[data-date]')).toHaveCount(30);
  await expect(page.getByText('View daily figures', { exact: true })).toHaveCount(0);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await chooseSelect(page, 'Overview period', 'Last 7 days');
    await expect(trend.locator('circle[data-date]')).toHaveCount(7);
    await chooseSelect(page, 'Overview period', 'Last 30 days');
    await expect(trend.locator('circle[data-date]')).toHaveCount(30);
  }
});
