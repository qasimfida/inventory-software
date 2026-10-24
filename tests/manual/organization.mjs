import { exerciseResponsiveAccessibility } from './responsive-accessibility.mjs';
import { exerciseAppearanceSettings } from './appearance-settings.mjs';
import { exerciseScreenRefinement } from './screen-refinement.mjs';
import { exerciseReferenceLayout } from './reference-layout.mjs';
import { exerciseStage6 } from './stage6.mjs';
import { exerciseStage5 } from './stage5.mjs';
import { exerciseSettings } from './settings.mjs';
import { exerciseCommerce } from './commerce.mjs';
import { exercisePayables } from './payables.mjs';
import { exerciseCustomers } from './customers.mjs';
import { exercisePurchasing } from './purchasing.mjs';
import { exerciseStorage } from './storage.mjs';
import { exerciseTransfers } from './transfers.mjs';
import { exerciseInventory } from './inventory.mjs';
import { exercisePricing } from './pricing.mjs';
import { exerciseCatalog } from './catalog.mjs';
import { exerciseRecovery } from './recovery.mjs';
import { exerciseSessionHosts } from './session-hosts.mjs';
/* global window, document */
// Run against disposable migrated API/web servers. Supply E2E_WEB_URL and E2E_INVITATION.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const email = 'browser-e2e@example.test';
const password = 'correct horse battery staple';
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const earlyFeatureRequests = [];
  const trackDeferred = (request) => {
    if (
      /\/features\/(notifications|visualization|trading|accounting|integrations)\/|\/reports\/ReportsPanel/.test(
        request.url(),
      )
    )
      earlyFeatureRequests.push(new URL(request.url()).pathname);
  };
  page.on('request', trackDeferred);
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.log('HTTP', response.status(), new URL(response.url()).pathname);
  });
  await page.goto(process.env.E2E_WEB_URL);
  await page.getByText('Settings', { exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'I have an invitation', exact: true }).click();
  await page.getByLabel('Account email', { exact: true }).fill(email);
  await page.getByLabel('Password (15–128 characters)', { exact: true }).fill(password);
  await page.getByLabel('Invitation code', { exact: true }).fill(process.env.E2E_INVITATION);
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  await page.getByLabel('New business name', { exact: true }).fill('Browser business');
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await exerciseSettings(page);
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Business & access', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Locations and devices' })).toBeVisible();
  await exerciseCatalog(page);
  async function createLocation(kind, name, code, parent, warehouse) {
    await page
      .getByRole('navigation', { name: 'Workspace sections' })
      .getByRole('button', { name: 'Business & access', exact: true })
      .click();
    await page.getByLabel('Entity', { exact: true }).selectOption(kind);
    await page.getByLabel('Location or terminal name', { exact: true }).fill(name);
    await page
      .getByLabel('Code (letters, numbers, underscore or hyphen)', { exact: true })
      .fill(code);
    if (parent)
      await page.getByLabel('Parent store', { exact: true }).selectOption({ label: parent });
    if (warehouse)
      await page
        .getByLabel('Warehouse (optional)', { exact: true })
        .selectOption({ label: warehouse });
    await page.getByRole('button', { name: 'Create location', exact: true }).click();
    await expect(page.getByRole('button', { name: `Edit ${name}`, exact: true })).toBeVisible();
  }
  await createLocation('stores', 'Main branch', 'MAIN');
  await exercisePricing(page);
  await createLocation('warehouses', 'Main warehouse', 'WH', 'Main branch');
  await exerciseInventory(page);
  await exercisePurchasing(page);
  await exerciseStorage(page);
  await exerciseTransfers(page);
  await exerciseCustomers(page);
  await createLocation('terminals', 'Till one', 'POS', 'Main branch', 'Main warehouse');
  await exerciseCommerce(page);
  await exercisePayables(page);
  expect(earlyFeatureRequests).toEqual([]);
  page.off('request', trackDeferred);
  await exerciseStage5(page);
  await exerciseStage6(page);
  await exerciseReferenceLayout(page);
  await exerciseScreenRefinement(page);
  await exerciseAppearanceSettings(page);
  await exerciseResponsiveAccessibility(page);
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Business & access', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit Till one', exact: true }).click();
  await page.getByLabel('Location state', { exact: true }).selectOption('suspended');
  await page.getByRole('button', { name: 'Save location', exact: true }).click();
  await expect(page.getByText(/Till one · POS · pos · suspended/)).toBeVisible();
  await page.getByRole('button', { name: 'View audit history', exact: true }).click();
  await expect(page.getByText(/terminals.updated/)).toBeVisible();
  await page.evaluate(axe.source);
  const accessibility = await page.evaluate(async () =>
    (
      await window.axe.run(document.querySelector('[aria-label="Organization management"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    ).violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
    })),
  );
  assert.deepEqual(accessibility, []);
  await page.getByLabel('Business name', { exact: true }).fill('Renamed business');
  await page.getByRole('button', { name: 'Save business', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Renamed business', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Workspace overview' })).toBeVisible();
  await expect(page.getByLabel('Business', { exact: true })).toContainText('Renamed business');
  await expect(page.getByLabel('Preview label', { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: /Workspace menu:/ }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Catalog & pricing', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'New product', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByText('Account & sessions', { exact: true }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Renamed business', exact: true })).toHaveCount(0);
  expect(runtimeErrors, 'Uncaught exceptions during the real-data workspace workflows').toEqual([]);
  await context.close();
  console.log(
    'PASS real API/browser organization CRUD, parent selections, suspension, audit, logout clearing and axe WCAG checks',
  );
  const desktop = await browser.newContext();
  await desktop.addInitScript(() =>
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {} }),
  );
  const native = await desktop.newPage();
  await native.goto(process.env.E2E_WEB_URL);
  await native.getByLabel('Account email', { exact: true }).fill(email);
  await native.getByLabel('Password', { exact: true }).fill(password);
  await native.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(native.getByRole('region', { name: 'Workspace overview' })).toBeVisible();
  await native.reload();
  await expect(native.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await native.getByLabel('Account email', { exact: true }).fill(email);
  await native.getByLabel('Password', { exact: true }).fill(password);
  await native.getByRole('button', { name: 'Log in', exact: true }).click();
  await native
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Business & access', exact: true })
    .click();
  await expect(native.getByText(/Till one · POS · pos · suspended/)).toBeVisible();
  assert.equal((await desktop.cookies()).length, 0);
  await native.reload();
  await expect(native.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await expect(native.getByText(/Till one · POS/)).toHaveCount(0);
  await desktop.close();
  console.log(
    'PASS simulated desktop bearer management and reload clearing (not a native WebView test)',
  );
  await exerciseSessionHosts(browser, email, password);
  await exerciseRecovery(browser, email);
} finally {
  await browser.close();
}
