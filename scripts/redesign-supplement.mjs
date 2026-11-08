/* global location */
import { applyCaptureTheme } from './redesign-browser.mjs';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = `${process.env.REDESIGN_OUT ?? '.ai/reports/redesign/before'}/supplement`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        timezoneId: 'UTC',
        locale: 'en-US',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
      await page.goto('http://127.0.0.1:5197');
      await page.getByLabel('Demonstration controls').waitFor();
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await page.waitForURL(/dashboard/);
      const capture = async (name) => {
        await page.waitForTimeout(500);
        const path = `${out}/${width}-${theme}-${name}.png`;
        await applyCaptureTheme(page, theme);
        await page.screenshot({ path, animations: 'disabled' });
        results.push({
          width,
          theme,
          name,
          path,
          route: await page.evaluate(() => location.hash),
          alerts: await page.locator('[role="alert"]:visible').allTextContents(),
        });
      };
      const nav = async (path) => {
        await page.evaluate((p) => {
          location.hash = p;
        }, path);
        await page.waitForTimeout(500);
      };
      await nav('/online-store/products/d0000000-0000-4000-8000-000000008000');
      await capture('online-product-valid-listing');
      await nav('/inventory');
      await capture('inventory-viewport');
      for (const name of ['New product', 'Add product']) {
        const action = page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
        if (await action.count()) {
          await action.first().click();
          await capture('product-editor');
          await page.keyboard.press('Escape');
          break;
        }
      }
      const detail = page.getByRole('button', {
        name: 'View details for Oak dining chair · Natural 1',
        exact: true,
      });
      if (await detail.count()) {
        await detail.first().click();
        await capture('product-details');
        await page.keyboard.press('Escape');
      }
      await nav('/catalog/d0000000-0000-4000-8000-000000000100');
      for (const tab of ['Stock', 'Pricing', 'History', 'Channels']) {
        const control = page.getByRole('tab', { name: tab, exact: true });
        if (await control.count()) {
          await control.click();
          await capture(`product-tab-${tab.toLowerCase()}`);
        }
      }
      await nav('/pos');
      const add = page.getByRole('button', { name: /^Add HP-/ }).first();
      if (await add.count()) {
        await add.click();
        await capture('pos-cart');
      }
      await context.close();
    }
  for (const role of [
    'superadmin',
    'owner',
    'manager',
    'cashier',
    'inventory',
    'accountant',
    'viewer',
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
    await page.goto('http://127.0.0.1:5197');
    await page.getByLabel('Account email').fill(`${role}@demo.example.test`);
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForTimeout(1000);
    const path = `${out}/role-${role}.png`;
    await page.screenshot({ path });
    results.push({
      role,
      path,
      landing: await page.evaluate(() => location.hash),
      links: await page
        .locator('nav a:visible')
        .evaluateAll((nodes) =>
          nodes.map((n) => ({ text: n.textContent, href: n.getAttribute('href') })),
        ),
    });
    await context.close();
  }
} catch (error) {
  results.push({ error: error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`${results.length} supplemental captures/results`);
}
