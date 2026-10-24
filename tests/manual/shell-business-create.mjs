/* global location */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5191');
  await page.getByLabel('Account email').fill('superadmin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill('asdF@123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).waitFor();
  await page.evaluate(() => {
    location.hash = '/admin/businesses';
  });
  await page.getByRole('button', { name: 'Add business', exact: true }).click();
  const name = `UI drawer review ${Date.now()}`;
  await page.getByLabel('Business name', { exact: true }).fill(name);
  const created = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/businesses'),
  );
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const business = await response.json();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Search registered businesses' }).fill(name);
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: `Show locations for ${name}` }).click();
  await expect(
    page.getByText('No registered stores or warehouses.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await writeFile(
    'docs/qa/shell-business-directory/create-result.json',
    JSON.stringify(
      {
        api: 'isolated retained development database on port 3191',
        name,
        id: business.id,
        status: 201,
        checks: [
          'create through drawer',
          'refresh/filter created business',
          'empty location state',
          'logout',
        ],
        retained: true,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
