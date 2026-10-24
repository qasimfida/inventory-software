/* global document, innerWidth, innerHeight, scrollTo */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const folder = 'docs/qa/operations-expansion';
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }),
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5173');
await page.getByLabel('Account email', { exact: true }).fill('admin@inv.com');
await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
await page.getByRole('button', { name: 'Log in', exact: true }).click();
await page.waitForURL(/dashboard|admin/);
const results = [];
for (const path of [
  '/pos',
  '/catalog',
  '/inventory',
  '/settings/staff',
  '/notifications',
  '/logs',
  '/settings/device',
  '/customers',
  '/transfers',
  '/sales',
]) {
  await page.goto(`http://127.0.0.1:5173/#${path}`);
  await page.waitForTimeout(1500);
  results.push({
    path,
    headings: await page.locator('main h2:visible').allTextContents(),
    tables: await page.locator('main table:visible').count(),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  });
  await page.screenshot({
    path: `${folder}/${path.replaceAll('/', '-').slice(1)}.png`,
    fullPage: false,
  });
}
await page.goto('http://127.0.0.1:5173/#/pos');
await page
  .getByRole('button', { name: /Add SHOW-NOTE/ })
  .first()
  .waitFor();
await page
  .getByRole('button', { name: /Add SHOW-NOTE/ })
  .first()
  .click();
await page.waitForTimeout(800);
await page.evaluate(() => scrollTo(0, 600));
await page.waitForTimeout(500);
const sticky = await page.evaluate(() => ({
  header: document.querySelector('.app-header')?.getBoundingClientRect().bottom,
  cart: document.querySelector('.pos-cart')?.getBoundingClientRect().top,
  checkout: document.querySelector('.pos-checkout-footer')?.getBoundingClientRect().bottom,
  viewport: innerHeight,
}));
await page.screenshot({ path: `${folder}/pos-scrolled.png` });
writeFileSync(`${folder}/browser.json`, JSON.stringify({ results, sticky, errors }, null, 2));
await browser.close();
