import { expect, test } from '@playwright/test';

test('loading warehouse planning alongside inventory keeps sibling identities unique', async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on('console', (message) => {
    if (/same key|unique.*key/i.test(message.text())) duplicateKeys.push(message.text());
  });
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await expect(page.getByText('HP-001', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Reorder policies and order holds', { exact: true })).toBeVisible();
  expect(duplicateKeys).toEqual([]);
});
