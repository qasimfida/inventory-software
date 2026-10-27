import { test, expect } from '@playwright/test';
import { chooseSelect } from '../browser/select-control';
test('overview states, scoped attention links, role controls and typography across themes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/online-store';
  });
  await expect(
    page.getByRole('heading', { name: 'Online store overview', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Configured, not live', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Sold-out active listings/ }).click();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByRole('combobox', { name: 'Attention', exact: true })).toContainText(
    'Sold-out active listings',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Ready to publish/ }).click();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await chooseSelect(page, 'Attention', 'Sold-out active listings');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: /Active/ })).toHaveAttribute('data-state', 'active');
  await expect(page.getByRole('cell', { name: /^Sold out/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Online store overview', exact: true }),
  ).toBeVisible();
  await chooseSelect(page, 'Scenario', 'store-live');
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
  await expect(page.getByText(/Public storefront URL is not available/)).toBeVisible();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark'])
      for (const font of ['system-ui', 'Karla', 'Lora', 'Georgia, serif', 'monospace']) {
        await page.evaluate(
          ({ theme, font }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.setProperty('--font-family-sans', font);
          },
          { theme, font },
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        const headerSearch = page.getByRole('combobox', { name: 'Search routes and records' });
        await expect(headerSearch).toHaveAttribute('placeholder', 'Search');
      }
    await page.screenshot({ path: `/tmp/online-overview-${width}.png`, fullPage: true });
  }
  await page.context().setOffline(true);
  await expect(page.getByRole('button', { name: 'Re-check all', exact: true })).toBeDisabled();
  await page.context().setOffline(false);
  await chooseSelect(page, 'Scenario', 'store-disabled');
  await expect(page.getByText('Disabled', { exact: true })).toBeVisible();
  await chooseSelect(page, 'Role', 'manager');
  await expect(page.getByRole('button', { name: 'Re-check all', exact: true })).toHaveCount(0);
  await chooseSelect(page, 'Role', 'cashier');
  await expect(
    page.getByRole('heading', { name: 'Online store overview', exact: true }),
  ).toHaveCount(0);
});
