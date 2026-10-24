/* global location, document, innerWidth, window */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  availableRoutes,
  workspaceRoutes,
} from '../../packages/api-client/dist/workspace-navigation.js';
import {
  developmentAccounts,
  developmentPassword,
} from '../../apps/api/dist/development/fixtures.js';
const base = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5191';
const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3191';
const out = 'docs/qa/feature-audit';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [],
  issues = [];
try {
  for (const account of developmentAccounts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    let path = 'login';
    const errors = [],
      failed = [];
    page.on('pageerror', (e) => errors.push({ path, message: e.message }));
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('/auth/session'))
        failed.push({ path, status: r.status(), url: new URL(r.url()).pathname });
    });
    await page.goto(base);
    await page.getByLabel('Account email', { exact: true }).fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('.app-header')).toBeVisible();
    await page.waitForTimeout(500);
    const landing = new URL(page.url()).hash;
    const list = await context.request.get(api + '/api/v1/businesses');
    expect(list.status()).toBe(200);
    const businesses = (await list.json()).businesses;
    const business = businesses.find((b) => b.name === 'Demo Retail') ?? businesses[0];
    const routes = availableRoutes(business);
    for (const route of routes) {
      path = route.path;
      await page.evaluate((p) => {
        location.hash = p;
        window.scrollTo(0, 0);
      }, path);
      await page.waitForTimeout(450);
      const alerts = await page.locator('main [role=alert]:visible').allTextContents();
      const text = await page.locator('main').innerText();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const denied = /Access unavailable|not allow this page/.test(text);
      if (alerts.length || overflow || denied)
        issues.push({ account: account.email, path, alerts, overflow, denied });
      results.push({ account: account.email, role: business.role, path, alerts, overflow });
    }
    for (const route of workspaceRoutes.filter((r) => !routes.some((a) => a.path === r.path))) {
      path = route.path;
      await page.evaluate((p) => {
        location.hash = p;
      }, path);
      await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
    }
    path = '/dashboard';
    await page.evaluate(() => {
      location.hash = '/dashboard';
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${account.role}-${account.email.split('@')[0]}.png` });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('header .connection-indicator')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      const navigation = page
        .getByRole('dialog')
        .getByRole('navigation', { name: 'Main navigation' });
      const links = navigation.locator('.shell-nav-link');
      await expect(navigation.locator('.sidebar-group .shell-nav-link')).toHaveCount(
        await links.count(),
      );
      await page.keyboard.press('Escape');
    }
    await page.reload();
    await expect(page.locator('.app-header')).toBeVisible();
    if (errors.length || failed.length) issues.push({ account: account.email, errors, failed });
    console.log(
      JSON.stringify({
        account: account.email,
        landing,
        allowed: routes.length,
        denied: workspaceRoutes.length - routes.length,
        errors,
        failed,
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(out + '/roles.json', JSON.stringify({ results, issues }, null, 2) + '\n');
}
console.log(JSON.stringify({ screens: results.length, issues }));
if (issues.length) process.exitCode = 1;
