import { chooseSelect } from './select-control';
import { test, expect } from '@playwright/test';

test('table density, exact numeric alignment and contained keyboard overflow', async ({ page }) => {
  await page.goto('/#/design-system');
  const region = page.getByRole('region', { name: 'Exact-value example table' });
  const table = region.getByRole('table');
  await expect(table).toBeVisible();
  const row = table.locator('tbody tr').first();
  expect((await table.locator('thead tr').boundingBox())!.height).toBe(40);
  expect((await row.boundingBox())!.height).toBe(44);
  const value = table.getByRole('cell', { name: '9007199254740993', exact: true });
  expect(await value.evaluate((el) => getComputedStyle(el).textAlign)).toBe('right');
  expect(await value.evaluate((el) => getComputedStyle(el).textOverflow)).not.toBe('ellipsis');
  await page.evaluate(() => {
    document.documentElement.dataset.density = 'compact';
  });
  expect((await row.boundingBox())!.height).toBe(34);
  await page.setViewportSize({ width: 320, height: 900 });
  await region.evaluate((el) => {
    el.style.maxWidth = '160px';
  });
  await region.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(value).toHaveText('9007199254740993');
});

test('native dates and disclosures retain values through expansion and theme changes', async ({
  page,
}) => {
  await page.goto('/#/design-system');
  const date = page.getByLabel('Example date (UTC)', { exact: true });
  await date.fill('2026-11-15');
  const summary = page.getByRole('button', { name: 'Expandable example', exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  const field = page.getByLabel('Retained disclosure value', { exact: true });
  await field.fill('Retained local draft');
  await summary.click();
  await expect(field).toBeHidden();
  await chooseSelect(page, 'Appearance', 'dark');
  await summary.click();
  await expect(field).toHaveValue('Retained local draft');
  await expect(date).toHaveValue('2026-11-15');
  await expect(date).toHaveAttribute('min', '2026-01-01');
  await expect(date).toHaveAttribute('max', '2026-12-31');
  expect(await date.evaluate((el) => getComputedStyle(el).colorScheme)).toBe('dark');
});

test('collapsed navigation names appear on keyboard focus and dismiss with Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/design-system');
  const rail = page.getByRole('navigation', { name: 'Example icon rail' });
  const button = rail.getByRole('button', { name: 'First section' });
  await button.scrollIntoViewIfNeeded();
  // Drain the scroll event before opening Radix's focus tooltip (scroll dismisses it).
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await button.evaluate((element) => element.focus({ preventScroll: true }));
  const tooltip = page.getByRole('tooltip', { name: 'First section' });
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-current', 'page');
});

test('compact confirmation remains contained with large text on short screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/#/design-system');
  await page.evaluate(() => {
    document.documentElement.dataset.textSize = 'large';
  });
  await page.getByRole('button', { name: 'Reset example' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  const box = (await dialog.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(408);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});
