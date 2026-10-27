/* global location, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const out = 'artifacts/qa/feedback-sync';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const evidence = { checks: [], errors: [] };
page.on('pageerror', (e) => evidence.errors.push(e.message));
let original;
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill('owner@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  const settingsUrl = 'http://127.0.0.1:3100/api/v1/auth/settings';
  const setting = await (
    await context.request.get(settingsUrl, { headers: { 'x-inventory-client': 'web' } })
  ).json();
  original = setting.preferences.values.states;
  const saved = await context.request.put(settingsUrl, {
    headers: { 'x-inventory-client': 'web', origin: 'http://127.0.0.1:5173' },
    data: {
      version: setting.preferences.version,
      values: { ...setting.preferences.values, states: 'enhanced' },
    },
  });
  expect(saved.ok()).toBe(true);
  await page.reload();
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-states', 'enhanced');
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  const search = page.getByRole('combobox', { name: 'Search products', exact: true });
  await expect(search).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export shown products' })).toBeEnabled();
  await search.fill('NO-SUCH-FEEDBACK-TEST');
  await expect(page.getByText('No matching products', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Try another search or clear your filters to see more products.'),
  ).toBeVisible();
  await expect(page.locator('.feedback-state svg')).toBeVisible();
  await expect(page.locator('.feedback-state button')).toHaveCount(0);
  evidence.checks.push('Enhanced empty search: icon/title/description; no create action');
  await page.screenshot({ path: `${out}/catalog-empty.png` });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filter product status' }).click();
  await page.getByRole('option', { name: 'inactive', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('1 active filters')).toBeVisible();
  await page.getByRole('button', { name: /Filters 1/ }).hover();
  await expect(page.getByRole('tooltip')).toContainText('Status: inactive');
  evidence.checks.push('Applied filter count and tooltip');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    location.hash = '/notifications';
  });
  await expect(
    page.getByRole('combobox', { name: 'Search notification events or references' }),
  ).toBeVisible();
  await expect(page.locator('section.collection-surface').first()).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Search notification events or references' })
    .fill('NO-SUCH-FEEDBACK-TEST');
  await expect(page.getByText('No matching notifications', { exact: true })).toBeVisible();
  evidence.checks.push('Notifications: shared toolbar, card surface, contextual empty state');
  await page.screenshot({ path: `${out}/notifications.png` });
  await page.evaluate(() => {
    location.hash = '/logs';
  });
  await expect(page.getByRole('combobox', { name: 'Search loaded audit events' })).toBeVisible();
  await expect(page.getByText(/Actor: .*@/).first()).toBeVisible();
  await page.getByRole('button', { name: 'View change details' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Activity details' })).toBeVisible();
  await page.screenshot({ path: `${out}/audit-details.png` });
  await page.getByRole('button', { name: 'Close Activity details' }).click();
  evidence.checks.push('Audit actor email and change-detail drawer');
  await page.route(/\/products\?/, (route) => route.abort());
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  await page.getByRole('button', { name: 'Refresh catalog', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await page.unroute(/\/products\?/);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await expect(page.getByText('No matching products', { exact: true })).toBeVisible();
  evidence.checks.push('Failed catalog request has retry; retry recovers');
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await expect(page.locator('.product-card').first()).toBeVisible();
  await page.clock.install();
  await context.setOffline(true);
  await expect(page.getByText(/Connection unavailable. Cached cash checkout/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Unlock saved register', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(65000);
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Unlock saved register', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `${out}/offline-fallback.png` });
  await context.setOffline(false);
  await expect(page.getByText(/Connection unavailable. Cached cash checkout/)).toHaveCount(0, {
    timeout: 15000,
  });
  evidence.checks.push(
    'Network loss keeps bounded session and automatically opens prepared-register fallback; restoration detected',
  );
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => {
      location.hash = '/notifications';
    });
    await expect(page.locator('section.collection-surface').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    evidence.checks.push(`Notifications viewport ${width}: no page overflow`);
  }
} finally {
  await context.setOffline(false);
  if (original) {
    const url = 'http://127.0.0.1:3100/api/v1/auth/settings';
    const setting = await (
      await context.request.get(url, { headers: { 'x-inventory-client': 'web' } })
    ).json();
    await context.request.put(url, {
      headers: { 'x-inventory-client': 'web', origin: 'http://127.0.0.1:5173' },
      data: {
        version: setting.preferences.version,
        values: { ...setting.preferences.values, states: original },
      },
    });
  }

  await writeFile(`${out}/browser.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
