/* global document, location, innerWidth, getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  errors = [];
async function navigate(page, path) {
  await page.evaluate((path) => {
    location.hash = path;
  }, path);
}
try {
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5188');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
    if (width >= 1024) {
      const rail = page.getByRole('separator', { name: 'Resize sidebar' });
      await rail.focus();
      await page.keyboard.press('End');
      await expect(rail).toHaveAttribute('aria-valuenow', '384');
      await page.keyboard.press('Home');
      await expect(rail).toHaveAttribute('aria-valuenow', '208');
      const bounds = await rail.boundingBox();
      await page.mouse.move(bounds.x + 4, bounds.y + 180);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 84, bounds.y + 180);
      await page.mouse.up();
      await expect(rail).toHaveAttribute('aria-valuenow', '288');
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
      await expect(rail).toHaveAttribute('aria-valuenow', '288');
      await expect(page.locator('header .connection-indicator')).toHaveCount(0);
      await expect(page.locator('.sidebar-utilities .connection-indicator')).toBeVisible();
      await page.getByRole('button', { name: 'Switch workspace' }).click();
      await expect(page.locator('.workspace-menu input[type=checkbox]')).toHaveCount(0);
      await page.getByRole('button', { name: /Reserve warehouse/ }).click();
      await expect(page.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
      await page.getByRole('button', { name: 'Switch workspace' }).click();
      await page.getByRole('button', { name: 'All authorized locations' }).click();
    }
    await navigate(page, '/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(25);
    const all = page.getByRole('checkbox', { name: 'Select loaded inventory' });
    await all.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await all.check();
    await expect(all).toBeChecked();
    await page.getByRole('tab', { name: 'Inventory grid view' }).click();
    await expect(page.locator('.inventory-product-card')).toHaveCount(25);
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page.getByText('0 selected', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Inventory list view' }).click();
    const stripe = await page
      .locator('table tbody tr')
      .evaluateAll((rows) => rows.slice(0, 2).map((row) => getComputedStyle(row).backgroundColor));
    expect(stripe[0]).not.toBe(stripe[1]);
    expect(
      await page
        .locator('table thead th')
        .first()
        .evaluate((e) => getComputedStyle(e).borderBottomWidth),
    ).toBe('1px');
    expect(
      await page
        .locator('table td[data-actions]')
        .first()
        .evaluate((e) => getComputedStyle(e).textAlign),
    ).toBe('right');
    await expect(page.locator('header').getByRole('button', { name: 'Go back' })).toBeVisible();
    await page.getByRole('button', { name: 'Theme and colors' }).click();
    const backgrounds = [];
    for (const color of ['teal', 'violet', 'rose', 'amber', 'Blue']) {
      await page.getByRole('button', { name: color, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute(
        'data-accent',
        color === 'Blue' ? 'default' : color,
      );
      backgrounds.push(
        await page
          .locator('.app-sidebar')
          .first()
          .evaluate((e) => getComputedStyle(e).backgroundColor),
      );
    }
    expect(new Set(backgrounds).size).toBe(5);
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `artifacts/qa/sidebar-refinement/inventory-${width}-dark.png` });
    await navigate(page, '/settings/preferences');
    await expect(page.getByRole('heading', { name: 'Typography', exact: true })).toBeVisible();
    const tabs = page.locator('.settings-tabs');
    expect(await tabs.evaluate((e) => getComputedStyle(e).overflowX)).toBe('auto');
    await page.getByRole('radio', { name: 'large', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
    await page.getByRole('radio', { name: 'violet', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'violet');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({
      path: `artifacts/qa/sidebar-refinement/preferences-${width}-dark.png`,
    });
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () =>
      (
        await globalThis.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        })
      ).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    );
    expect(violations).toEqual([]);
    await page.getByRole('radio', { name: 'small', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'small');
    if (width === 1440) {
      await page.getByRole('combobox', { name: 'Role', exact: true }).click();
      await page.getByRole('option', { name: 'Cashier', exact: true }).click();
      await navigate(page, '/dashboard');
      await expect(page.getByRole('heading', { name: 'Point of sale', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Switch workspace' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Back to management' })).toHaveCount(0);
      await page.screenshot({ path: 'artifacts/qa/sidebar-refinement/cashier-pos.png' });
      await page.getByRole('combobox', { name: 'Role', exact: true }).click();
      await page.getByRole('option', { name: 'Manager', exact: true }).click();
      await navigate(page, '/dashboard');
      await expect(page.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Switch workspace' })).toBeDisabled();
    }
    results.push({
      width,
      checks:
        'resize (desktop), workspace, selections, stripes, palette, dark theme, large/small text, settings overflow, axe',
      violations,
    });
    await context.close();
  }
  expect(errors).toEqual([]);
  await writeFile(
    'artifacts/qa/sidebar-refinement/browser-results.json',
    JSON.stringify(
      { results, errors, data: 'local fixtures; no real transaction mutations' },
      null,
      2,
    ),
  );
  console.log('Sidebar refinement browser checks passed');
} finally {
  await browser.close();
}
