import { test, expect } from '@playwright/test';
test('storage and hierarchy share one responsive workspace and keep the legacy route', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sales trend', exact: true })).toBeVisible();
  for (const [route, width] of [
    ['/storage', 1280],
    ['/warehouse-view', 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((path) => {
      location.hash = path;
    }, route);
    const workspace = page.getByRole('region', { name: 'Warehouse & storage', exact: true });
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole('tablist', { name: 'Storage view' })).toHaveClass('view-tabs');
    await expect(
      page.getByRole('heading', { name: 'Warehouse & storage', exact: true }),
    ).toHaveCount(1);
    await expect(workspace.getByRole('tab', { name: 'Locations', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      workspace.getByRole('combobox', { name: 'Search storage code / name' }),
    ).toBeVisible();
    await expect(
      workspace.getByRole('button', { name: 'Create storage location', exact: true }),
    ).toBeVisible();
    const search = workspace.getByRole('combobox', { name: 'Search storage code / name' });
    await search.fill('Living');
    await expect(search).toBeFocused();
    await expect(workspace.getByRole('button', { name: 'Living zone', exact: true })).toBeVisible();
    await search.fill('');
    await search.press('Escape');
    await workspace.getByRole('button', { name: 'Living zone', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Storage location details' })).toBeVisible();
    await expect(page.getByRole('form', { name: 'Save location LIVING' })).toHaveCount(0);
    await page.getByText('Edit location', { exact: true }).click();
    await expect(page.getByRole('form', { name: 'Save location LIVING' })).toBeVisible();
    await page.getByRole('button', { name: 'Close Storage location details', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Storage location details' })).toHaveCount(0);
    await expect(
      workspace.getByRole('button', { name: 'Warehouse balances', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/storage-locations-${width}.png`, fullPage: true });
    await workspace.getByRole('tab', { name: 'Browse hierarchy', exact: true }).click();
    await expect(
      workspace.getByRole('region', { name: 'Warehouse hierarchy', exact: true }),
    ).toBeVisible();
    await expect(
      workspace.getByRole('region', { name: 'Location stock', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/storage-hierarchy-${width}.png`, fullPage: true });
    await workspace.getByRole('tab', { name: 'Locations', exact: true }).click();
  }
});

test('users without stock access cannot open the storage workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sales trend', exact: true })).toBeVisible();
  const { chooseSelect } = await import('../browser/select-control');
  await chooseSelect(page, 'Role', 'viewer');
  await page.evaluate(() => {
    location.hash = '/storage';
  });
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Warehouse & storage', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'Warehouse & storage', exact: true })).toHaveCount(0);
});
