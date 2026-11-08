import { test, expect } from '@playwright/test';
test('separates access, compensation and management navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      location.hash = '/team';
    });
    await expect(page.getByRole('button', { name: 'Add member', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Search staff', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Base salary' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Demo colleague 1', exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/qa/team-separation/team-${width}.png` });
    await page.evaluate(() => {
      location.hash = '/salaries';
    });
    await expect(page.getByRole('columnheader', { name: 'Base salary' })).toBeVisible();
    await page.screenshot({ path: `artifacts/qa/team-separation/salaries-${width}.png` });
    for (const route of ['business', 'security', 'locations', 'audit', 'company']) {
      await page.evaluate((route) => {
        location.hash = '/settings/' + route;
      }, route);
      await expect(page.getByRole('tablist', { name: 'Settings navigation' })).toHaveCount(0);
      if (route === 'company')
        await expect(page.getByText('Business palette', { exact: true })).toHaveCount(0);
    }
    await page.evaluate(() => {
      location.hash = '/settings/preferences';
    });
    await expect(page.getByRole('tablist', { name: 'Settings navigation' })).toBeVisible();
    for (const name of [
      'Business',
      'Security',
      'Stores & terminals',
      'Business audit',
      'Components / Design system',
    ])
      await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
});
