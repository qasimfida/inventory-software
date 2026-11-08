/* global location, document, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const result = {
  method:
    'Development mock transport on localhost; Chrome 1440x900, UTC/en-US, fixed Date; automation overhead included; not production INP or device performance.',
  samples: [],
  issues: [],
};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
  await page.goto('http://127.0.0.1:5197');
  await page.getByLabel('Demonstration controls').waitFor();
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/dashboard/);
  for (let trial = 0; trial < 5; trial++) {
    await page.evaluate(() => {
      location.hash = '/dashboard';
    });
    await page.waitForTimeout(100);
    const start = performance.now();
    await page.evaluate(() => {
      location.hash = '/pos';
    });
    const cards = page.locator('.product-grid:visible .product-card');
    await cards.first().waitFor();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    result.samples.push({
      metric: trial ? 'warm POS list readiness' : 'cold POS list readiness',
      trial,
      milliseconds: Math.round(performance.now() - start),
      visibleCards: await cards.count(),
    });
    const input = page.getByRole('combobox', { name: 'POS product search', exact: true });
    await input.fill('');
    await page.waitForTimeout(500);
    const query = trial % 2 ? 'Linen' : 'Oak';
    const searchStart = performance.now();
    await input.fill(query);
    await page.getByRole('option').filter({ hasText: query }).first().waitFor();
    await page.waitForFunction((q) => {
      const cards = [...document.querySelectorAll('.product-grid .product-card')].filter(
        (e) => e.getClientRects().length,
      );
      return cards.length > 0 && cards.every((e) => e.textContent.includes(q));
    }, query);
    result.samples.push({
      metric: 'search to matching suggestion and filtered cards (debounce included)',
      trial,
      query,
      milliseconds: Math.round(performance.now() - searchStart),
      visibleCards: await cards.count(),
    });
    await input.fill('');
    await page.waitForTimeout(500);
  }
} catch (error) {
  result.issues.push(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    `${process.env.REDESIGN_OUT ?? '.ai/reports/redesign/before'}/performance.json`,
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result));
}
