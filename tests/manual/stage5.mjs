/* global document, window */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exerciseStage5(page) {
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  await nav.getByRole('button', { name: 'Business & access', exact: true }).click();
  await page.getByText('Business policy', { exact: true }).click();
  await page.getByLabel('Business profile', { exact: true }).selectOption('wholesale');
  await page.getByLabel('Low-stock threshold (SKU base units)', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save business policy', exact: true }).click();
  await expect(
    page.getByText('Wholesale · Trade customers · Supply purchases', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Visualization detail', { exact: true }).selectOption('enhanced');
  await expect(page.getByLabel('Visualization detail', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await nav.getByRole('button', { name: 'Purchasing', exact: true }).click();
  const create = page.getByRole('form', { name: 'Create purchase order', exact: true });
  await create.getByLabel('Purchase reference', { exact: true }).fill('REVIEW-PO');
  await create.getByLabel('Order quantity', { exact: true }).fill('2');
  await create.getByLabel('Unit cost', { exact: true }).fill('3');
  await create.getByRole('button', { name: 'Create purchase order', exact: true }).click();
  await expect(page.getByLabel('Purchase order', { exact: true })).toContainText('REVIEW-PO');
  await nav.getByRole('button', { name: 'Notifications & approvals', exact: true }).click();
  await page.getByRole('button', { name: 'Review REVIEW-PO', exact: true }).click();
  const review = page.getByRole('region', { name: 'Approval review', exact: true });
  await expect(review.getByText(/at 3.000000 USD each/)).toBeVisible();
  await review
    .getByLabel('Approval reason (10–240 characters)', { exact: true })
    .fill('Reviewed supplier order');
  await review.getByRole('button', { name: 'Confirm approval', exact: true }).click();
  await expect(
    review.getByRole('heading', { name: 'Purchase REVIEW-PO · approved', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review REVIEW-PO', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Reports & dashboard', exact: true }).click();
  const report = page.getByRole('region', { name: 'Reports and dashboard', exact: true });
  await expect(report.getByRole('table')).toBeVisible();
  for (const section of [
    'purchases',
    'payments',
    'receivables',
    'payables',
    'inventory',
    'movements',
  ]) {
    await report.getByLabel('Report', { exact: true }).selectOption(section);
    await report.getByRole('button', { name: 'Run report', exact: true }).click();
    await expect(report.getByRole('button', { name: 'Run report', exact: true })).toBeEnabled();
    await expect(report.getByRole('alert')).toHaveCount(0);
    await expect(report.getByText(/Generated /)).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.evaluate(axe.source);
  expect(
    await page.evaluate(async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Reports and dashboard"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => v.id),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await nav.getByRole('button', { name: 'Warehouse hierarchy', exact: true }).click();
  const hierarchy = page.getByRole('region', { name: 'Warehouse hierarchy', exact: true });
  await expect(hierarchy.getByRole('table')).toBeVisible();
  await hierarchy.getByRole('button', { name: 'Use 2D hierarchy cards', exact: true }).click();
  const child = hierarchy.getByLabel('Schematic child locations').getByRole('button').first();
  await child.focus();
  await page.keyboard.press('Enter');
  await expect(
    hierarchy.getByRole('button', { name: 'Parent location', exact: true }),
  ).toBeEnabled();
  await hierarchy.getByRole('button', { name: 'Parent location', exact: true }).click();
  await expect(
    hierarchy.getByRole('button', { name: 'Parent location', exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Warehouse hierarchy"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => v.id),
    ),
  ).toEqual([]);
  console.log(
    'PASS Stage 5 browser: reviewed approval, seven report categories, 320px report accessibility and real warehouse hierarchy',
  );
}
