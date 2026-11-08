import { test, expect } from '@playwright/test';
for (const width of [1280, 390]) {
  test(`Quill product descriptions retain formatting and safe form data at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true, level: 1 }),
    ).toBeVisible();
    await page.evaluate(() => {
      location.hash = '/inventory';
    });
    await page.getByRole('button', { name: 'New product', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Description', exact: true });
    await expect(editor).toBeVisible();
    await editor.fill('Durable ceramic mug');
    await editor.press('ControlOrMeta+a');
    await page.getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(editor.locator('strong')).toHaveText('Durable ceramic mug');
    const stored = page.locator('input[name="description"]');
    await expect(stored).toHaveValue(
      /<!--inventory-description:v1-->.*<strong>Durable\s+ceramic\s+mug<\/strong>/,
    );
    await page.getByRole('button', { name: 'Product basics', exact: true }).click();
    await page.getByRole('button', { name: 'Product basics', exact: true }).click();
    await expect(editor.locator('strong')).toHaveText('Durable ceramic mug');
    await page.screenshot({ path: `artifacts/quill-product-${width}.png` });
    expect(errors).toEqual([]);
  });
}
