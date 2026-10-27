/* global location, window, document, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { availableRoutes } from '../../packages/api-client/dist/workspace-navigation.js';
import { demoRoles, identitySeed } from '../../packages/api-client/dist/mock/identity.js';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  issues = [];
try {
  for (const width of [390, 768, 1440])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await context.newPage();
      page.on('pageerror', (error) => issues.push({ width, colorScheme, error: error.message }));
      await page.goto(process.env.SHELL_URL ?? 'http://127.0.0.1:5188');
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page).toHaveURL(/dashboard/);
      for (const role of demoRoles) {
        await page.getByRole('combobox', { name: 'Role', exact: true }).click();
        await page.getByRole('option', { name: role, exact: true }).click();
        const routes = availableRoutes(identitySeed(0, role).business).filter(
          (r) => role !== 'superadmin' || r.path !== '/dashboard',
        );
        if (role === 'superadmin')
          routes.push(
            { path: '/admin', title: 'Platform overview' },
            { path: '/admin/businesses', title: 'Registered businesses' },
          );
        for (const route of routes) {
          await page.evaluate((path) => {
            location.hash = path;
            window.scrollTo(0, 0);
          }, route.path);
          await expect(page.locator('.app-header h1')).toHaveText(route.title);
          await page.waitForTimeout(650);
          const alerts = await page.locator('[role=alert]:visible').allTextContents();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          if (alerts.length || overflow)
            issues.push({ width, colorScheme, role, path: route.path, alerts, overflow });
          const directory = `artifacts/qa/screens/web/${width}-${colorScheme}-${role}`;
          await mkdir(directory, { recursive: true });
          await page.screenshot({
            path: `${directory}/${route.path.slice(1).replaceAll('/', '-')}.png`,
          });
          results.push({ width, colorScheme, role, path: route.path, overflow, alerts });
        }
        console.log(`${width} ${colorScheme} ${role}: ${routes.length} routes`);
      }
      await context.close();
    }
} finally {
  await browser.close();
  await writeFile(
    'artifacts/qa/web-matrix.json',
    JSON.stringify({ results, issues }, null, 2) + '\n',
  );
}
console.log(JSON.stringify({ screens: results.length, issues }));
if (issues.length) process.exitCode = 1;
