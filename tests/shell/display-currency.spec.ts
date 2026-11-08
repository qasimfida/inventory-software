import { chooseSelect } from '../browser/select-control';
import { test, expect } from '@playwright/test';
import type { SettingsModel } from '@inventory/api-client';
test('display currency updates product estimates without changing the POS settlement currency', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  await page.waitForFunction(async () => {
    const modulePath = '/src/platform/settings.ts';
    const { settingsModel } = (await import(modulePath)) as { settingsModel: SettingsModel };
    const state = settingsModel.snapshot();
    return Boolean(
      state.snapshot && state.business && !state.busy && state.rates.reason === 'not-configured',
    );
  });
  // Explicit test-only provider fixture; not a live rate or production configuration.
  await page.evaluate(async () => {
    const modulePath = '/src/platform/settings.ts';
    const { settingsModel } = (await import(modulePath)) as { settingsModel: SettingsModel };
    const now = Date.now();
    settingsModel.client.rates = async () => ({
      reason: null,
      snapshot: {
        source: 'Open Exchange Rates',
        base: 'USD',
        asOf: new Date(now).toISOString(),
        fetchedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        rates: { USD: '1', PKR: '280' },
      },
    });
    await settingsModel.refreshRates();
    location.hash = '/settings/preferences';
  });
  await expect(page.getByRole('combobox', { name: 'Display currency', exact: true })).toBeEnabled();
  await chooseSelect(page, 'Display currency', 'PKR');
  await expect(page.getByLabel('Display currency information')).toContainText(
    'Display estimates: PKR',
  );
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  const add = page.getByRole('button', { name: /^Add / }).filter({ hasText: '≈ PKR' }).first();
  await expect(add).toBeVisible();
  await expect(add).toContainText('$');
  await add.click();
  await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  await expect(page.locator('.checkout-total dd')).toHaveText(/^\$[0-9.]+$/);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `artifacts/qa/currency-palette/pos-estimate-${width}.png` });
  }
  await page.evaluate(async () => {
    const modulePath = '/src/platform/settings.ts';
    const { settingsModel } = (await import(modulePath)) as { settingsModel: SettingsModel };
    settingsModel.client.rates = async () => {
      throw new Error('Offline fixture');
    };
    await settingsModel.refreshRates();
  });
  await expect(add).toContainText('cached offline');
  await page.evaluate(async () => {
    const modulePath = '/src/platform/settings.ts';
    const { settingsModel } = (await import(modulePath)) as { settingsModel: SettingsModel };
    const before = settingsModel.snapshot().rates.snapshot!;
    settingsModel.client.rates = async () => ({
      snapshot: {
        ...before,
        asOf: new Date(Date.now() - 90000000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      },
      reason: 'stale',
    });
    await settingsModel.refreshRates();
  });
  await expect(page.getByLabel('Display currency information')).toContainText('Rates are stale');
  await expect(
    page.getByRole('button', { name: /^Add / }).filter({ hasText: 'estimate stale' }).first(),
  ).toBeVisible();
});
