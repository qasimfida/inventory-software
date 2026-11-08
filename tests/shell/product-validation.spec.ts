import { expect, test } from '@playwright/test';
for (const width of [1280, 390]) {
  test(`product validation and live SKU feedback at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.evaluate(() => {
      location.hash = '/inventory';
    });
    await page.getByRole('button', { name: 'New product', exact: true }).click();
    const save = page.getByRole('button', { name: 'Save details & continue', exact: true });
    await save.click();
    await expect(page.locator('.product-error-toast')).toBeVisible();
    await expect(page.getByLabel('Product name', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await page.getByRole('button', { name: 'Dismiss error' }).click();
    await page.getByLabel('Product name', { exact: true }).fill('Validation example');
    await page.getByLabel('SKU', { exact: true }).fill('HP-001');
    await expect(page.getByText('SKU ID already exists.')).toBeVisible();
    await expect(save).toBeDisabled();
    await page.getByRole('button', { name: 'View existing SKU product' }).click();
    await expect(page.getByRole('tooltip')).toContainText('HP-001');
    await page.screenshot({ path: `artifacts/qa/product-validation/sku-preview-${width}.png` });
    await page.getByLabel('Product name', { exact: true }).click();
    await page.getByLabel('SKU', { exact: true }).fill('VALIDATION-UNUSED');
    await expect(
      page.getByRole('button', { name: 'SKU ID is available.', exact: true }),
    ).toBeVisible();
    await expect(save).toBeEnabled();
    await page.getByRole('button', { name: 'Images and product codes', exact: true }).click();
    await page
      .getByLabel('Image HTTPS URLs (one per line)', { exact: true })
      .fill('http://invalid.test/image');
    await page.getByRole('button', { name: 'Images and product codes', exact: true }).click();
    await save.click();
    await expect(page.getByLabel('Image HTTPS URLs (one per line)', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel('Image HTTPS URLs (one per line)', { exact: true }),
    ).toHaveAttribute('aria-invalid', 'true');
    await page.screenshot({
      path: `artifacts/qa/product-validation/fields-${width}.png`,
      fullPage: false,
    });
    expect(errors).toEqual([]);
  });
}
