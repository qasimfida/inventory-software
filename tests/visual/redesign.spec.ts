import { expect, test } from '@playwright/test';
const cases = [
  ['login', '/auth/login'],
  ['shell-dashboard', '/dashboard'],
  ['inventory', '/inventory'],
  ['product-detail', '/catalog/d0000000-0000-4000-8000-000000000100'],
  ['pos', '/pos'],
  ['purchasing', '/purchasing'],
  ['reports', '/reports'],
  ['settings', '/settings/company'],
  ['preferences', '/settings/preferences'],
  ['drawer', '/online-store/products/add'],
  ['showcase', '/design-system'],
  ['dialog', '/design-system'],
  ['empty', '/inventory'],
  ['loading', '/online-store'],
] as const;
for (const [width, theme, density] of [
  [1440, 'light', 'compact'],
  [1440, 'dark', 'comfortable'],
  [390, 'light', 'comfortable'],
  [390, 'dark', 'compact'],
] as const) {
  for (const [name, path] of cases) {
    test(`${width}-${theme}-${density}-${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === 'http://127.0.0.1:5197' || ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort();
      });
      await page.goto('/');
      await page.getByLabel('Demonstration controls').waitFor();
      if (!['login', 'showcase', 'dialog'].includes(name)) {
        await page.getByLabel('Account email').fill('owner@demo.example.test');
        await page.getByLabel('Password', { exact: true }).fill('local-demo');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page.waitForURL(/dashboard/);
        await page.waitForTimeout(1000);
      }
      if (name === 'empty' || name === 'loading') {
        await page.getByRole('combobox', { name: 'Scenario', exact: true }).click();
        await page
          .getByRole('option', { name: name === 'empty' ? 'empty' : 'slow', exact: true })
          .click({ force: true });
        await expect(page.getByRole('combobox', { name: 'Scenario', exact: true })).toContainText(
          name === 'empty' ? 'empty' : 'slow',
        );
      }
      await page.evaluate((path) => {
        location.hash = path;
      }, path);
      if (name !== 'loading') await page.waitForTimeout(700);
      else {
        await expect(
          page.getByText('Loading online store overview…', { exact: true }),
        ).toBeVisible();
        await page.clock.pauseAt(new Date('2026-11-06T12:00:01Z'));
      }
      await page.evaluate(
        async ({ theme, density }) => {
          // Isolated preview: no persisted account values or production data are written.
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.density = density;
          await document.fonts.ready;
        },
        { theme, density },
      );
      if (name === 'dialog') await page.getByRole('button', { name: 'Reset example' }).click();
      if (name === 'drawer') await expect(page.getByRole('dialog')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page).toHaveScreenshot(`${width}-${theme}-${density}-${name}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixels: 0,
      });
    });
  }
}
