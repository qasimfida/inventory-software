import { chooseSelect } from './select-control';
import { test, expect } from '@playwright/test';

test('showcase navigation, themes and local interactions do not request API data', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url());
  });
  await page.goto('/#/design-system');
  await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Loading, empty, offline and error states', exact: true })
    .click();
  await expect(page.locator('#showcase-feedback')).toBeFocused();
  expect(page.url()).toContain('#/design-system');
  await chooseSelect(page, 'Example state', 'offline');
  await expect(page.getByText(/No server confirmation/)).toBeVisible();
  await chooseSelect(page, 'Example state', 'error');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('No example records yet')).toBeVisible();
  await chooseSelect(page, 'Appearance', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('textbox', { name: 'Preview label', exact: true }).fill('Local preview');
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(page.getByText(/Preview updated: Local preview/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  for (const title of ['Web component API reference', 'Native component API reference']) {
    await page.getByText(title, { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await page.getByText(title, { exact: true }).click();
  }
  expect(requests).toEqual([]);
  await page.getByRole('link', { name: 'Back to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});
