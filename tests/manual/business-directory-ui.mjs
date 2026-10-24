/* global location, document, innerWidth, getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5188');
  await page.getByLabel('Account email', { exact: true }).fill('superadmin@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business registrations trend' })).toBeVisible();
  await expect(page.getByText('View daily figures', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /View all businesses/ })).toHaveCount(1);
  await page.getByRole('link', { name: /View all businesses/ }).click();
  await expect(page.getByRole('table')).toContainText('Harbor & Pine');
  await page
    .getByRole('button', { name: /Show locations for/ })
    .first()
    .click();
  await expect(page.getByRole('table')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Main warehouse', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Business status' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Business status' }).click();
  await page.getByRole('option', { name: 'Archived', exact: true }).click();
  await expect(page.getByText('No matching businesses.', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Business status' }).click();
  await page.getByRole('option', { name: 'All statuses', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('table').first()).toContainText('Harbor & Pine');
  await page.getByRole('button', { name: 'Add business', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add business' })).toBeVisible();
  await expect(page.getByLabel('Business name', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /grid view/ }).click();
  await page.getByRole('button', { name: 'View locations', exact: true }).first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('region', { name: 'Warehouses', exact: true })).toBeVisible();
  await expect(drawer.getByRole('table')).toHaveCount(0);
  await expect
    .poll(async () => {
      const box = await drawer.boundingBox();
      return Math.round(box.x + box.width);
    })
    .toBe(1440);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'docs/qa/business-directory/grid-locations.png',
    animations: 'disabled',
  });
  await drawer.getByRole('button', { name: 'Main warehouse', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Location details' })).toContainText(
    'Main warehouse',
  );
  await page.keyboard.press('Escape');
  results.push({
    overviewLink: true,
    nestedTables: true,
    gridLocationCards: true,
    filters: true,
    createDrawer: true,
    locationDetails: true,
  });
  await page.evaluate(() => (location.hash = '/settings/preferences'));
  await page.getByRole('heading', { name: 'Preferences', exact: true }).first().waitFor();
  const shape = page
    .getByRole('group')
    .filter({ has: page.getByRole('radio', { name: 'circle', exact: true }) });
  for (const radius of ['circle', 'rounded']) {
    await shape.getByRole('radio', { name: radius, exact: true }).locator('..').click();
    await expect(page.locator('html')).toHaveAttribute('data-radius', radius);
    const radii = await page
      .locator(
        '.segmented-options, .segmented-options span, .overflow-tabs, .settings-navigation [role="tab"]',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => parseFloat(getComputedStyle(node).borderTopLeftRadius)),
      );
    expect(radii.every((value) => (radius === 'circle' ? value > 100 : value < 30))).toBe(true);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      const tabs = page.getByRole('tablist', { name: 'Settings navigation' });
      await expect(tabs).toBeVisible();
      const wrapper = await page.locator('.overflow-tabs').boundingBox();
      expect(wrapper.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `docs/qa/business-directory/preferences-${radius}-${width}.png`,
        animations: 'disabled',
      });
      results.push({
        width,
        radius,
        overflow: false,
        radiusApplied: true,
        tabsWidth: wrapper.width,
      });
    }
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await writeFile(
    'docs/qa/business-directory/browser-results.json',
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
}
