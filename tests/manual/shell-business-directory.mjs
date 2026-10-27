/* global document, location, getComputedStyle, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const checks = [],
  errors = [];
const out = 'artifacts/qa/shell-business-directory';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email').fill('superadmin@inv.com');
  await page.getByLabel('Password', { exact: true }).fill('asdF@123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open profile menu' })).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/admin';
  });
  await page.getByRole('link', { name: 'View all businesses' }).click();
  await expect(
    page.getByRole('heading', { name: 'Registered businesses', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Show locations for Local Development Business' }),
  ).toBeVisible();
  await page.screenshot({ path: `${out}/businesses-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Show locations for Local Development Business' }).click();
  await page.getByRole('button', { name: 'Development Warehouse', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Location details' })).toBeVisible();
  await page.screenshot({ path: `${out}/location-drawer.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Businesses grid view' }).click();
  await expect(page.locator('.inventory-product-grid')).toBeVisible();
  await page.getByRole('button', { name: 'Local Development Business', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Business details' })).toBeVisible();
  await page.keyboard.press('Escape');
  checks.push(
    'platform directory link, nested locations, grid, business and warehouse detail drawers, Escape',
  );
  const search = page.getByRole('combobox', { name: 'Search registered businesses' });
  await search.fill('No business matches this');
  await expect(page.getByText('No matching businesses.', { exact: true })).toBeVisible();
  await search.fill('');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Add business', exact: true }).click();
  await expect(page.getByLabel('Business name', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  checks.push('search empty/recovery; creation drawer focus and dismissal (no mutation)');
  const toggle = page.getByRole('button', { name: 'Collapse sidebar', exact: true });
  await expect(toggle).toBeVisible();
  const sidebar = await page.locator('.desktop-sidebar').boundingBox(),
    box = await toggle.boundingBox();
  expect(Math.abs(box.x + box.width / 2 - sidebar.width)).toBeLessThan(2);
  await toggle.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  checks.push('fixed border-aligned sidebar toggle, Radix tooltip hover/Escape');
  await page.evaluate(() => {
    location.hash = '/settings/preferences';
  });
  await expect(page.getByRole('tab', { name: 'Preferences', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('.overflow-tabs')).toBeVisible();
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      scrollbar: getComputedStyle(document.querySelector('.settings-tabs')).scrollbarWidth,
      background: getComputedStyle(document.querySelector('.overflow-tabs')).backgroundColor,
    }));
    if (layout.overflow) {
      await page.screenshot({ path: `${out}/overflow-${width}.png` });
      console.log(
        width,
        await page.evaluate(() =>
          [...document.querySelectorAll('*')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .slice(-20)
            .map((e) => [
              e.tagName,
              e.className,
              e.getBoundingClientRect().width,
              e.getBoundingClientRect().right,
            ]),
        ),
      );
    }
    expect(layout.overflow).toBe(false);
    expect(layout.scrollbar).toBe('none');
    if (width === 390) {
      await page.getByRole('button', { name: 'Scroll settings tabs right' }).click();
      await expect(page.locator('.overflow-tabs')).toHaveAttribute('data-left', 'true');
    }
    await page.screenshot({ path: `${out}/preferences-${width}.png`, fullPage: true });
    checks.push(`settings tabs ${width}px, no page overflow or scrollbar`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Preferences', exact: true }).click();
  await expect(page.locator('.preferences-dialog')).toBeVisible();
  expect((await page.locator('.preferences-dialog').boundingBox()).width).toBeGreaterThan(700);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  expect(errors).toEqual([]);
  await writeFile(
    `${out}/browser-results.json`,
    JSON.stringify({ checks, errors, businessMutations: false }, null, 2),
  );
} finally {
  await browser.close();
}
