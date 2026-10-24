/* global location, document, innerWidth, window */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5188');
  await page.getByLabel('Account email', { exact: true }).fill('superadmin@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Business registrations trend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toHaveCount(
    1,
  );
  await page.getByRole('link', { name: /View all businesses/ }).click();
  await expect(page.getByRole('table')).toContainText('Harbor & Pine');
  await expect(page.getByRole('columnheader', { name: 'Stores', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /grid view/ }).click();
  await page.getByRole('button', { name: 'View locations', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Main warehouse');
  await page.keyboard.press('Escape');
  await page.evaluate(() => (location.hash = '/settings/preferences'));
  await page.getByRole('heading', { name: 'Preferences', exact: true }).first().waitFor();
  for (const [size, pixels] of [
    ['small', 16],
    ['medium', 20],
    ['large', 24],
  ]) {
    const group = page.getByRole('combobox', { name: 'Icon size', exact: true });
    if (await group.count()) {
      await group.click();
      await page.getByRole('option', { name: size, exact: true }).click();
    } else {
      await page
        .getByRole('group', { name: 'Icon size', exact: true })
        .getByRole('radio', { name: size, exact: true })
        .locator('..')
        .click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-icon-size', size);
    expect(
      await page
        .locator('.header-theme svg')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width),
    ).toBe(pixels);
  }
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.evaluate(() => window.scrollTo(0, 500));
    const tabs = await page.locator('.overflow-tabs').boundingBox();
    const header = await page.locator('.app-header').boundingBox();
    expect(tabs.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    await page.screenshot({
      path: `docs/qa/operational-ui/preferences-${width}.png`,
      animations: 'disabled',
    });
    results.push({ width, overflow: false, stickyTabs: true });
  }
  await page.evaluate(() => (location.hash = '/logs'));
  await expect(
    page.getByRole('button', { name: 'Restricted diagnostics', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restricted diagnostics', exact: true }).click();
  await expect(page.locator('main')).toContainText('Simulated unavailable service');
  expect(errors).toEqual([]);
  results.push({
    platformChart: true,
    counts: true,
    gridLocationDrawer: true,
    iconSizes: [16, 20, 24],
    logs: true,
    errors,
  });
} finally {
  await browser.close();
  await writeFile('docs/qa/operational-ui/browser-results.json', JSON.stringify(results, null, 2));
}
