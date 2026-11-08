import { expect, test } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';

test('owner collection actions, setup links and responsive POS retain their workflows', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const setup = page.getByRole('navigation', { name: 'Business setup' });
  await expect(setup.getByRole('link')).toHaveCount(6);
  await expect(setup.getByRole('button')).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/customers';
  });
  await expect(page.getByRole('button', { name: 'Add customer', exact: true })).toBeVisible();
  await expect(page.getByText('Customer privacy and retention', { exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/team';
  });
  await expect(
    page.getByRole('combobox', { name: 'Search team members', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Staff and salaries', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Assign member', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Member email')).toBeVisible();
  await page.getByRole('button', { name: 'Close Assign member', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/staff';
  });
  await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff and salaries', exact: true })).toHaveCount(
    0,
  );
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await page
    .getByRole('button', { name: /^Add HP-/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await page
    .getByRole('button', { name: 'Increase Quantity 1', exact: true })
    .click({ clickCount: 3 });
  await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Remove line 2', exact: true })).toHaveCount(0);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/qa/workflow-refinement/pos-${width}.png`,
      animations: 'disabled',
      timeout: 10000,
    });
  }
  await page.getByRole('button', { name: 'Remove line 1', exact: true }).click();
  await page
    .locator('.pos-products')
    .getByRole('button', { name: /^Actions for / })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Edit product / manage listing', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Deactivate product', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Close / })
    .click();
  await chooseSelect(page, 'Role', 'cashier');
  await expect(page.getByRole('button', { name: 'Manage listing', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Add or activate products in catalog', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('purchasing filters and dedicated online setup steps use the shared responsive layout', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.evaluate(() => {
    location.hash = '/purchasing';
  });
  await page.getByRole('button', { name: 'Purchasing filters', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Supplier history', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await chooseSelect(page, 'Scenario', 'empty');
  await page.evaluate(() => {
    location.hash = '/online-store';
  });
  const setup = page.getByRole('region', { name: 'Complete your online store', exact: true });
  await expect(setup).toBeVisible();
  await expect(setup.getByRole('link', { name: 'Set up online store', exact: true })).toBeVisible();
  await expect(setup).not.toContainText('0 of 0 steps');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBeTruthy();
  await setup.screenshot({
    path: 'artifacts/qa/workflow-refinement/online-setup-390.png',
    animations: 'disabled',
    timeout: 10000,
  });
});
