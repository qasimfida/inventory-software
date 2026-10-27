/* global location, getComputedStyle, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const evidence = { checks: [], errors: [] };
page.on('pageerror', (error) => evidence.errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Account email', { exact: true }).fill('owner@inv.com');
  await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.app-header')).toBeVisible();
  await page.evaluate(() => {
    location.hash = '/settings/staff';
  });
  await expect(page).toHaveURL(/#\/staff$/);
  await expect(page.getByRole('combobox', { name: 'Search staff and expenses' })).toBeVisible();
  expect(await page.getByRole('button', { name: 'Clear search' }).count()).toBe(0);
  const title = page
    .getByRole('region', { name: 'staff', exact: true })
    .locator('tbody th button')
    .first();
  await expect(title).toBeVisible();
  await title.hover();
  expect(await title.evaluate((node) => getComputedStyle(node).textDecorationLine)).toBe(
    'underline',
  );
  const name = await title.innerText();
  await title.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toContainText(name);
  await expect(drawer).toContainText('Base salary');
  await expect(drawer).toContainText('Record ID');
  await drawer.getByRole('button', { name: 'Edit staff details' }).click();
  await expect(drawer.getByRole('textbox', { name: 'Full name' })).toHaveValue(name);
  await page.screenshot({ path: 'artifacts/qa/staff-navigation/details.png' });
  await drawer.getByRole('link', { name: 'Manage permissions and access' }).click();
  await expect(page).toHaveURL(/#\/team$/);
  await page
    .getByRole('button', { name: /Edit membership/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Save membership' })).toBeVisible();
  evidence.checks.push(
    'Owner: legacy link redirects to staff; title hover underlines; record opens in drawer; editing is prefilled; account access editor opens without submitting changes',
  );
  await page.evaluate(() => {
    location.hash = '/settings/preferences';
  });
  expect(await page.getByRole('tab', { name: 'Staff & expenses' }).count()).toBe(0);
  expect(await page.getByRole('tab', { name: 'Team & permissions' }).count()).toBe(0);
  evidence.checks.push('Staff and account access are absent from settings tabs');
  await page.evaluate(() => {
    location.hash = '/staff';
  });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  evidence.checks.push('Staff page has no document overflow at 390, 768, 1440px');
} finally {
  await writeFile(
    'artifacts/qa/staff-navigation/browser.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  await browser.close();
}
