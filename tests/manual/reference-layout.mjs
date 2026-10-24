/* global document, window */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exerciseReferenceLayout(page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  await nav.getByRole('button', { name: 'Overview', exact: true }).click();
  const dashboard = page.getByRole('region', { name: 'Business dashboard' });
  await expect(dashboard.getByRole('button', { name: 'Refresh dashboard' })).toBeEnabled();
  await expect(dashboard.locator('.metric-card').first()).toBeVisible();
  await expect(page.getByLabel('Account appearance', { exact: true })).not.toBeVisible();
  await page.screenshot({ path: 'test-results/reference-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Open point of sale', exact: true }).click();
  await page
    .getByRole('button', { name: 'Add BROWSER-SKU · Browser product', exact: true })
    .click();
  await page.getByLabel('Quantity 1', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Quantity 1', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Calculate checkout total', exact: true }).click();
  await expect(page.getByText('Total payment', { exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const previous = await page
      .getByRole('button', { name: 'Previous products', exact: true })
      .boundingBox();
    const next = await page
      .getByRole('button', { name: 'More products', exact: true })
      .boundingBox();
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    expect(
      Math.max(next.x - previous.x - previous.width, next.y - previous.y - previous.height),
      'Product pagination controls remain visually separate when wrapping',
    ).toBeGreaterThanOrEqual(8);
    await page.evaluate(axe.source);
    const failures = await page.evaluate(async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Point of sale"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => v.id),
    );
    expect(failures).toEqual([]);
    await page.screenshot({ path: `test-results/reference-pos-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Remove line 1', exact: true }).click();
  await page.getByRole('button', { name: 'Back to management', exact: true }).click();
  await nav.getByRole('button', { name: /Workspace menu:/ }).click();
  await nav.getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inventory snapshot', exact: true })).toBeVisible();
  await expect(
    nav.getByRole('button', { name: 'Catalog & pricing', exact: true }),
  ).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log(
    'PASS reference layouts: real dashboard/quote, Settings-only appearance, preserved cart, responsive menu, 320/390/1440px overflow and POS accessibility',
  );
}
