/* global document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { availableRoutes } from '../../packages/api-client/dist/workspace-navigation.js';
import { identitySeed } from '../../packages/api-client/dist/mock/identity.js';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [],
  issues = [];
try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme,
      }),
      page = await context.newPage();
    let currentPath = 'login';
    page.on('pageerror', (e) => issues.push({ colorScheme, error: e.message }));
    page.on('console', (m) => {
      if (m.type() === 'error') issues.push({ colorScheme, path: currentPath, console: m.text() });
    });
    await page.goto(process.env.EXPO_WEB_URL ?? 'http://127.0.0.1:8088');
    await page.getByLabel('Account email', { exact: true }).fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'More', exact: true })).toBeVisible();
    for (const role of [
      'owner',
      'manager',
      'cashier',
      'inventory',
      'accountant',
      'viewer',
      'superadmin',
    ]) {
      const routes = availableRoutes(identitySeed(0, role).business);
      for (const route of routes) {
        currentPath = route.path;
        await page.getByRole('tab', { name: 'More', exact: true }).click();
        await page.getByLabel('Search pages and records', { exact: true }).fill(route.title);
        await page.getByRole('button', { name: route.title, exact: true }).last().click();
        await expect(
          page
            .getByRole('heading', {
              name:
                role === 'superadmin' && route.path === '/dashboard'
                  ? 'Platform overview'
                  : route.title,
              exact: true,
            })
            .first(),
        ).toBeVisible();
        await page.waitForTimeout(650);
        const alerts = await page.locator('[role=alert]:visible').allTextContents();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (alerts.length || overflow)
          issues.push({ colorScheme, role, path: route.path, alerts, overflow });
        const dir = `artifacts/qa/screens/mobile/expo-web-${colorScheme}-${role}`;
        await mkdir(dir, { recursive: true });
        await page.screenshot({ path: `${dir}/${route.path.slice(1).replaceAll('/', '-')}.png` });
        results.push({ colorScheme, role, path: route.path, alerts, overflow });
      }
      console.log(`${colorScheme} ${role}: ${routes.length} routes`);
      if (role !== 'superadmin')
        await page.getByRole('button', { name: `Role: ${role}`, exact: true }).click();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    'artifacts/qa/mobile-matrix.json',
    JSON.stringify({ results, issues }, null, 2) + '\n',
  );
}
console.log(JSON.stringify({ screens: results.length, issues }));
if (issues.length) process.exitCode = 1;
