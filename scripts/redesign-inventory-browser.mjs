/* global document, location, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-6-inventory-validation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const width of [390, 844, 1024, 1280, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 844 ? 390 : 900 },
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    page.setDefaultTimeout(10000);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.route('https://**', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
    await page.goto('http://127.0.0.1:5197');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(/dashboard/);
    for (const theme of ['light', 'dark']) {
      await applyCaptureTheme(page, theme);
      for (const route of ['/inventory', '/categories', '/catalog']) {
        await page.evaluate((path) => {
          location.hash = path;
        }, route);
        await settle(page);
        if (
          route !== '/categories' &&
          (await page.getByRole('radio', { name: 'Products & pricing', exact: true }).count())
        ) {
          await page
            .locator('label')
            .filter({ has: page.getByRole('radio', { name: 'Products & pricing', exact: true }) })
            .click();
        }
        if (route !== '/categories')
          await expect(
            page.getByRole('button', { name: /^View details for / }).first(),
          ).toBeVisible();
        else
          await expect(
            page.getByRole('button', { name: 'Add category', exact: true }),
          ).toBeVisible();
        await page.screenshot({
          path: `${out}/${width}-${theme}-${route.slice(1)}.png`,
          animations: 'disabled',
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        results.push({ width, theme, route, overflow });
        expect(overflow).toBe(false);
        if (route === '/inventory') {
          await page
            .locator('label')
            .filter({ has: page.getByRole('radio', { name: 'Stock & movements', exact: true }) })
            .click();
          await expect(page.locator('.inventory-snapshot tbody tr').first()).toBeVisible();
          await settle(page);
          await expect(page.locator('.metric-grid')).not.toContainText('—');
          await page.screenshot({
            path: `${out}/${width}-${theme}-stock.png`,
            animations: 'disabled',
          });
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
            false,
          );
          if (width === 1440) {
            await page
              .getByRole('button', { name: 'Stock operations and movement history', exact: true })
              .click();
            await expect(
              page.getByRole('table').filter({ hasText: 'Movement' }).first(),
            ).toBeVisible();
            await page.getByRole('button', { name: 'Post stock movement', exact: true }).click();
            await expect(
              page.getByRole('dialog', { name: 'Post stock movement', exact: true }),
            ).toBeVisible();
            await page.screenshot({
              path: `${out}/${width}-${theme}-movement-editor.png`,
              animations: 'disabled',
            });
            await page.keyboard.press('Escape');
          }
        }
      }
      if (width === 1440) {
        await page
          .getByRole('button', { name: /^View details for / })
          .first()
          .click();
        await expect(
          page.getByRole('dialog', { name: 'Product detail', exact: true }),
        ).toBeVisible();
        await page.getByRole('link', { name: 'Open full product details' }).click();
        for (const tab of ['Overview', 'Pricing', 'Stock', 'History', 'Channels']) {
          await page.getByRole('tab', { name: tab, exact: true }).click();
          await settle(page);
          await page.screenshot({
            path: `${out}/1440-${theme}-product-${tab}.png`,
            animations: 'disabled',
          });
        }
        await page.getByRole('tab', { name: 'Overview', exact: true }).click();
        await page.getByRole('button', { name: 'Edit product details', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Edit product', exact: true })).toBeVisible();
        for (const tab of ['Details', 'Price & units', 'Quantity', 'Listing availability']) {
          await page
            .locator('label')
            .filter({ has: page.getByRole('radio', { name: tab, exact: true }) })
            .click();
          await expect(page.getByRole('radio', { name: tab, exact: true })).toBeChecked();
          await settle(page);
          await page.screenshot({
            path: `${out}/1440-${theme}-edit-${tab.replaceAll(/[^a-z]/gi, '-')}.png`,
            animations: 'disabled',
          });
        }
        await page.getByRole('button', { name: 'Done', exact: true }).click();
      }
    }
    expect(runtimeErrors).toEqual([]);
    results.push({ width, runtimeErrors });
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(
  `${results.length} route/viewport/theme cases passed; five detail tabs and four editor sections captured in both themes.`,
);
