/* global document, location, window, innerWidth */
import { chromium } from '@playwright/test';
import {
  screenshot,
  choose,
  settle,
  extraViewports,
  applyCaptureTheme,
} from './redesign-browser.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const base = process.env.REDESIGN_URL ?? 'http://127.0.0.1:5197';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error('Baseline requires a loopback mock server');
const out = process.env.REDESIGN_OUT ?? '.ai/reports/redesign/before';
const routes = JSON.parse(await readFile('.ai/reports/redesign/routes.json', 'utf8'));
const results = [],
  issues = [];
const browser = await chromium.launch({ channel: 'chrome' });

try {
  await mkdir(`${out}/screens`, { recursive: true });
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        locale: 'en-US',
        timezoneId: 'UTC',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
      const runtime = [];
      page.on('pageerror', (e) => runtime.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') runtime.push(m.text());
      });
      // Guard against accidentally contacting a live API or external image/provider during baseline.
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === base || ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort();
      });
      await page.goto(base);
      await page.getByLabel('Demonstration controls').waitFor();
      for (const auth of routes.filter((r) => r.path.startsWith('/auth/'))) {
        await page.evaluate((path) => {
          location.hash = path;
        }, auth.path);
        await settle(page);
        await applyCaptureTheme(page, theme);
        results.push({
          path: auth.path,
          width,
          theme,
          role: 'guest',
          scenario: 'no token',
          status: 'captured',
          finalHash: await page.evaluate(() => location.hash),
          screenshot: await screenshot(
            page,
            `${width}-${theme}-${auth.path.slice(1).replaceAll('/', '-')}`,
          ),
        });
      }
      await page.evaluate(() => {
        location.hash = '/auth/login';
      });
      await page.getByLabel('Account email').fill('owner@demo.example.test');
      await page.getByLabel('Password', { exact: true }).fill('local-demo');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await page.waitForURL(/dashboard/);
      let role = 'owner';
      for (const route of routes.filter((r) => !r.path.startsWith('/auth/'))) {
        const record = {
          path: route.path,
          width,
          theme,
          role: route.path.startsWith('/admin') ? 'superadmin' : 'owner',
          scenario: 'normal',
        };
        if (route.path === '/more') {
          results.push({
            ...record,
            status: 'not-applicable',
            reason: 'Native-only route; mobile web width is not native qualification',
          });
          continue;
        }
        try {
          if (record.role !== role) {
            await choose(page, 'Role', record.role);
            role = record.role;
          }
          const path = route.path.replace(':id', 'd0000000-0000-4000-8000-000000000100');
          runtime.length = 0;
          await page.evaluate((next) => {
            location.hash = next;
            window.scrollTo(0, 0);
          }, path);
          await settle(page);
          await applyCaptureTheme(page, theme);
          record.finalHash = await page.evaluate(() => location.hash);
          record.headings = await page.locator('h1:visible,h2:visible').allTextContents();
          record.alerts = await page.locator('[role="alert"]:visible').allTextContents();
          record.overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          record.actualTheme = await page.locator('html').getAttribute('data-theme');
          record.runtimeErrors = [...runtime];
          record.screenshot = await screenshot(
            page,
            `${width}-${theme}-${route.path.slice(1).replaceAll('/', '-').replace(':', '') || 'root'}`,
          );
          record.status = 'captured';
          if (record.overflow || runtime.length) issues.push(record);
        } catch (error) {
          record.status = 'blocked';
          record.reason = error.message;
          issues.push(record);
        }
        results.push(record);
        console.log(`${width} ${theme} ${route.path}: ${record.status}`);
        await writeFile(
          `${out}/browser-results.json`,
          JSON.stringify(
            {
              method:
                'Mock UI; fixed Date, en-US/UTC; external requests blocked; viewport captures, not native/desktop runtime or transaction qualification',
              results,
              issues,
            },
            null,
            2,
          ),
        );
      }
      // Existing scenarios, not fabricated success paths.
      for (const scenario of ['empty', 'error', 'denied', 'offline', 'slow']) {
        try {
          await choose(page, 'Scenario', scenario);
          await page.evaluate(() => {
            location.hash = '/inventory';
          });
          await settle(page);
          const path = await screenshot(page, `${width}-${theme}-inventory-${scenario}`);
          results.push({
            path: '/inventory',
            width,
            theme,
            scenario,
            status: 'captured',
            screenshot: path,
            alerts: await page.locator('[role="alert"]:visible').allTextContents(),
          });
        } catch (e) {
          issues.push({ width, theme, scenario, error: e.message });
        }
      }
      await context.close();
    }
  await extraViewports(browser, base, results);
} catch (error) {
  issues.push({ fatal: error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    `${out}/browser-results.json`,
    JSON.stringify(
      {
        results,
        issues,
        methodology:
          'Fixed Date 2026-11-06T12:00:00Z; mocks only; no business mutation. Captures are not assertions that each workflow works. Browser mobile width does not qualify native.',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      captures: results.filter((r) => r.screenshot).length,
      issues: issues.length,
    }),
  );
}
