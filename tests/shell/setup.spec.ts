import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('owner setup and company defaults work at desktop and narrow viewport; cashier has no setup access', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toContainText(
    '6 of 6 steps complete',
  );
  await page.getByRole('link', { name: 'Transaction currency', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Default transaction currency', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Receipt footer', exact: true })
    .fill('Saved demo footer');
  await chooseSelect(page, 'Default transaction currency', 'PKR');
  await page.getByRole('button', { name: 'Save company profile', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Receipt footer', exact: true })).toHaveValue(
    'Saved demo footer',
  );
  await page
    .getByRole('button', { name: 'Save company profile', exact: true })
    .waitFor({ state: 'visible' });
  await page.evaluate(() => {
    location.hash = '/dashboard';
  });
  await page.getByRole('link', { name: 'Transaction currency', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Receipt footer', exact: true })).toHaveValue(
    'Saved demo footer',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('combobox', { name: 'Default transaction currency', exact: true }),
  ).toContainText('PKR');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await chooseSelect(page, 'Role', 'cashier');
  await page.evaluate(() => {
    location.hash = '/dashboard';
  });
  await expect(page).toHaveURL(/pos/);
  await expect(page.getByRole('region', { name: 'Business setup' })).toHaveCount(0);
});
