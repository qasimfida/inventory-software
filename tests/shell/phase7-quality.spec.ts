import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const viewports = [
  [1920, 1080],
  [1440, 900],
  [1100, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [844, 390],
] as const;
test('phase 7 responsive routes, drawers and keyboard-accessible controls', async ({ page }) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(10000);
  const errors: string[] = [];
  const evidence: unknown[] = [];
  const overflow: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  const routes = [
    ['cash', 'Search cash shifts'],
    ['inventory', 'Search products'],
    ['categories', 'Category status filter'],
    ['customers', 'Search customers / email / phone'],
    ['transfers', 'Create transfer draft'],
    ['payables', 'Supplier balances store'],
    ['sales', 'receipts list view'],
    ['team', 'Search staff'],
    ['salaries', 'Base salary'],
    ['pos', 'POS product search'],
  ];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const [route, marker] of routes) {
      await page.evaluate((r) => {
        location.hash = '/' + r;
      }, route!);
      await expect(
        page
          .getByText(marker!, { exact: true })
          .or(page.getByLabel(marker!, { exact: true }))
          .filter({ visible: true })
          .first(),
      ).toBeVisible();
      const measured = await page.evaluate(() => document.documentElement.scrollWidth);
      if (measured > width) overflow.push(`${route} ${width}x${height}: ${measured}`);
      let violations: unknown[] = [];
      if (width === 1440 || width === 390) {
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        violations = await page.evaluate(async () => {
          const axe = (
            window as unknown as {
              axe: {
                run: (options: object) => Promise<{
                  violations: { id: string; impact: string; nodes: { target: string[] }[] }[];
                }>;
              };
            }
          ).axe;
          const result = await axe.run({
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          });
          return result.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            targets: nodes.map((n) => n.target),
          }));
        });
      }
      evidence.push({ route, width, height, scrollWidth: measured, violations });
      await page.screenshot({ path: `artifacts/qa/phase7/${route}-${width}x${height}.png` });
    }
    await page.evaluate(() => {
      location.hash = '/catalog';
    });
    await expect(page.getByRole('button', { name: 'New product', exact: true })).toBeVisible();
    await page
      .locator('.selectable-card.product-card-link:visible')
      .first()
      .click({ position: { x: 40, y: 90 } });
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.getByRole('button', { name: 'Edit product details and pricing' }).click();
    await expect(page.getByLabel('Product name', { exact: true })).toBeVisible();
    await page.getByText('Price & units', { exact: true }).click();
    await page.getByRole('button', { name: 'Units and packaging', exact: true }).click();
    await expect(page.getByText('Quantity precision is fixed', { exact: false })).toBeVisible();
    const measured = await page.evaluate(() => document.documentElement.scrollWidth);
    if (measured > width) overflow.push(`product-editor ${width}x${height}: ${measured}`);
    await page.screenshot({ path: `artifacts/qa/phase7/product-editor-${width}x${height}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  writeFileSync(
    'artifacts/qa/phase7/responsive.json',
    JSON.stringify({ evidence, errors, overflow }, null, 2),
  );
  expect(overflow).toEqual([]);
  expect(errors).toEqual([]);
});
test('import spreadsheet preview and mappings remain usable across all target viewports', async ({
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
    buffer: Buffer.from(
      'Code,Title,Amount,Money,Description,Quantity,Unused supplier field\nSKU-1,Paint,12.50,USD,Long original supplier description,2,Source value',
    ),
  });
  for (const stage of ['preview', 'mapping']) {
    if (stage === 'mapping')
      await page.getByRole('button', { name: 'Continue to column mapping' }).click();
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await expect(
        stage === 'preview'
          ? page.getByRole('region', { name: 'Original source data' })
          : page.getByLabel('Source for SKU', { exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await (
        stage === 'preview'
          ? page.getByRole('region', { name: 'Original source data' })
          : page.getByLabel('Source for SKU', { exact: true })
      ).scrollIntoViewIfNeeded();
      const dialog = page.getByRole('dialog').first();
      const bounds = await dialog.boundingBox();
      expect(bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeLessThanOrEqual(height);
      await page.screenshot({ path: `artifacts/qa/phase7/import-${stage}-${width}x${height}.png` });
    }
  }
});
