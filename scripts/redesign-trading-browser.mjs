/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { applyCaptureTheme, settle, choose } from './redesign-browser.mjs';
const out = '.ai/reports/redesign/phase-7-trading-validation';
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
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://**', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
    await page.goto('http://127.0.0.1:5197');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(/dashboard/);
    for (const theme of ['light', 'dark']) {
      await applyCaptureTheme(page, theme);
      await page.evaluate(() => {
        location.hash = '/trading';
      });
      await expect(
        page.getByRole('region', { name: 'Trading relationships', exact: true }),
      ).toBeVisible();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.screenshot({
        path: `${out}/${width}-${theme}-overview.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'PARTNER-2026-018', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Shared order lines', exact: true }),
      ).toBeVisible();
      expect(
        await page
          .getByRole('region', { name: 'Shared order lines', exact: true })
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      await page.screenshot({
        path: `${out}/${width}-${theme}-details.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Shared order history', exact: true }).click();
      await expect(
        page.getByText('Demonstration partner accepted the order.', { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/${width}-${theme}-history.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Close Shared order details', exact: true }).click();
      const commands = [
        'Invite trading partner',
        'Confirm relationship decision',
        'Submit shared order terms',
        'Confirm shared order status',
      ];
      for (const name of commands) {
        await page.mouse.move(0, 0);
        if (await page.getByRole('menu', { name: 'Recent notifications', exact: true }).isVisible())
          await page.keyboard.press('Escape');
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
        await page.screenshot({
          path: `${out}/${width}-${theme}-${name.replaceAll(' ', '-')}.png`,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: `Close ${name}`, exact: true }).click();
      }
      if (width === 1440) {
        await choose(page, 'Scenario', 'empty');
        await expect(page.getByText('No trading relationships', { exact: true })).toBeVisible();
        await page.screenshot({ path: `${out}/${theme}-empty.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'error');
        await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.screenshot({ path: `${out}/${theme}-error.png`, animations: 'disabled' });
        await choose(page, 'Scenario', 'normal');
        await expect(
          page.getByRole('region', { name: 'Trading relationships', exact: true }),
        ).toBeVisible();
      }
      results.push({ width, theme, overview: 'passed', journal: 'passed', commands });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
} finally {
  await writeFile(`${out}/browser.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(
  `${results.length} trading viewport/theme cases passed; no financial commands submitted.`,
);
