import { test, expect } from '@playwright/test';
test('bulk import previews source and mapping controls at desktop and phone widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await page.getByRole('button', { name: 'Bulk import', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose CSV / Excel file' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'supplier.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Code,Title,Amount,Money\nSKU-1,Paint,12.50,USD'),
  });
  await expect(page.getByRole('region', { name: 'Original source data' })).toBeVisible();
  await expect(page.getByText('Paint', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Continue to column mapping' }).click();
  await expect(page.getByLabel('Source for SKU', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'artifacts/qa/bulk-import/desktop-mapping.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/qa/bulk-import/phone-mapping.png' });
});
