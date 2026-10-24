import { chooseSelect } from '../browser/select-control';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
test('isolates auth, preserves sidebar viewport and profile, and traps search focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.locator('.app-sidebar')).toHaveCount(0);
  await expect(page.getByText('Offline cash register', { exact: true })).toHaveCount(0);
  await login(page);
  await expect(page.getByRole('button', { name: 'Switch workspace', exact: true })).toHaveCount(0);
  const sidebar = page.locator('.desktop-sidebar .app-sidebar');
  expect((await sidebar.boundingBox())!.height).toBe(800);
  const nav = sidebar.locator('.sidebar-navigation'),
    profile = sidebar.locator('.sidebar-profile');
  const before = await profile.boundingBox();
  await nav.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  expect((await profile.boundingBox())!.y).toBe(before!.y);
  await expect(profile).toBeInViewport();
  await page.getByRole('button', { name: 'Theme and colors' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search workspace', exact: true }).fill('HP-002');
  await expect(page.getByRole('button', { name: /HP-002/ })).toBeVisible();
  await page.getByRole('button', { name: /HP-002/ }).click();
  await expect(page).toHaveURL(/catalog\?search=HP-002/);
  await expect(page.getByLabel('Search products')).toHaveValue('HP-002');
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('hides unauthorized routes and rejects direct access after a role change', async ({
  page,
}) => {
  await login(page);
  await chooseSelect(page, 'Role', 'cashier');
  await page.evaluate(() => {
    location.hash = '/accounting';
  });
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  await expect(
    page.locator('.desktop-sidebar').getByRole('link', { name: 'Accounting', exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/dashboard';
  });
  await expect(page).toHaveURL(/pos/);
  await expect(page.locator('.app-header h1')).toHaveText('Point of sale');
});
test('mobile navigation keeps actions reachable and closes on route selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Inventory', exact: true }).click();
  await expect(page).toHaveURL(/inventory/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
test('profile menu opens upward and demo failures recover without API traffic', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 800 });
  await login(page);
  const trigger = page.getByRole('button', { name: 'Open profile menu' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Profile menu' });
  await expect(menu).toBeVisible();
  expect((await menu.boundingBox())!.y).toBeLessThan((await trigger.boundingBox())!.y);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/catalog';
  });
  for (const scenario of ['error', 'offline']) {
    await chooseSelect(page, 'Scenario', scenario);
    await expect(page.locator('[role=alert]').first()).toBeVisible();
  }
  await chooseSelect(page, 'Scenario', 'normal');
  await expect(page.getByLabel('Search products')).toBeVisible();
  await expect(page.locator('[role=alert]')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('normal demo POS stays online without calling live readiness or business APIs', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });
  await login(page);
  await page.evaluate(() => {
    location.hash = '/pos';
  });
  await expect(page.getByRole('button', { name: /Add HP-002/ })).toBeVisible();
  await page.waitForTimeout(5500);
  await expect(page.getByRole('button', { name: /Add HP-002/ })).toBeVisible();
  await expect(page.getByText('Connection unavailable.', { exact: false })).toHaveCount(0);
  expect(requests).toEqual([]);
});
