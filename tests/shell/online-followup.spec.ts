import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
async function login(page: Page) {
  await page.goto('/auth#/auth/login');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business setup' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
}
test('compact server-backed setup dismissal, single navigation, attention chips and all-clear', async ({
  page,
}) => {
  await login(page);
  const setup = page.getByRole('region', { name: 'Business setup' });
  await expect(setup.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await setup.getByRole('button', { name: 'Dismiss completed setup' }).click();
  await expect(setup).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/online-store';
  });
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Online store', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('link', { name: /Listings with warnings/ }).click();
  await page.getByRole('button', { name: /Clear filter/ }).click();
  await expect(page).not.toHaveURL(/attention=/);
  await chooseSelect(page, 'Scenario', 'store-all-clear');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(page.getByText('All clear', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Products needing changes/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Add products', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Add products', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Add online products' });
  await picker
    .getByRole('checkbox', { name: /^Select / })
    .first()
    .check();
  await picker.getByRole('button', { name: /Add \d+ selected products/ }).click();
  await expect(page.getByRole('dialog', { name: 'Product results' })).toBeVisible();
  await page.getByRole('button', { name: 'View ready products', exact: true }).click();
  await expect(page).toHaveURL(/tab=ready/);
});
test('drawer catalog fix, effective price and shared Catalog Inventory POS consumers', async ({
  page,
}) => {
  await login(page);
  await chooseSelect(page, 'Scenario', 'store-live');
  await page.evaluate(() => {
    location.hash = '/online-store/products?tab=changes-required';
  });
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /errors, .*warnings/ }) })
    .first();
  await row.getByRole('button', { name: 'Edit online details', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Online product details', exact: true });
  await drawer.getByRole('button', { name: 'Edit product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Follow-up live product');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(drawer.getByText('Now ready to publish', { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Edit product', exact: true }).click();
  await page.getByRole('button', { name: 'Set / adjust price', exact: true }).click();
  await page.getByLabel('Base-unit selling price', { exact: true }).fill('87.25');
  await page.getByRole('button', { name: 'Publish price', exact: true }).click();
  await page.getByRole('button', { name: 'Close Variants and pricing', exact: true }).click();
  await expect(drawer.getByText(/\$87.25/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close Online product details', exact: true }).click();
  for (const path of ['/catalog', '/inventory', '/pos']) {
    await page.evaluate((path) => {
      location.hash = path;
    }, path);
    await expect(page.getByText('Follow-up live product', { exact: true }).first()).toBeVisible();
    await expect(
      page
        .getByText(/\$87.25/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  }
});
test('Catalog selected products use the shared selection command and result review', async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => {
    location.hash = '/online-store';
  });

  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  const select = page.getByRole('checkbox', { name: /for online store/ });
  await expect(select.first()).toBeVisible();
  await select.first().check();
  await page.getByRole('button', { name: 'Add to online store', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Product results' })).toBeVisible();
  await page.getByRole('button', { name: 'Review changes required', exact: true }).click();
  await expect(page).toHaveURL(/tab=changes-required/);
});
