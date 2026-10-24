import { test, expect } from '@playwright/test';

test('fine-pointer dimensions, loading geometry and native field semantics', async ({ page }) => {
  await page.goto('/#/design-system');
  for (const [name, height] of [
    ['Primary example', 40],
    ['Small example', 32],
    ['Large example', 48],
    ['Refresh example', 36],
  ] as const) {
    expect((await page.getByRole('button', { name, exact: true }).boundingBox())!.height).toBe(
      height,
    );
  }
  const input = page.getByRole('textbox', { name: 'Preview label', exact: true });
  expect((await input.boundingBox())!.height).toBe(40);
  const loading = page.getByRole('button', { name: 'Stable loading example', exact: true });
  const before = await loading.boundingBox();
  await loading.click();
  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  const after = await loading.boundingBox();
  expect(after!.width).toBe(before!.width);
  expect(after!.height).toBe(before!.height);
  await page.getByRole('button', { name: 'Finish local loading' }).click();
  await expect(loading).toBeEnabled();
  const toggle = page.getByRole('button', { name: 'Toggle example' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  await expect(page.getByRole('textbox', { name: 'Read-only reference' })).not.toBeEditable();
  await expect(page.getByRole('textbox', { name: 'Disabled field' })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Invalid example' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('coarse pointers retain touch targets even with compact density', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 375, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5180/#/design-system');
  await page.evaluate(() => {
    document.documentElement.dataset.density = 'compact';
  });
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  for (const name of ['Small example', 'Primary example', 'Refresh example']) {
    expect(
      (await page.getByRole('button', { name, exact: true }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
  }
  expect(
    (await page.getByRole('textbox', { name: 'Preview label', exact: true }).boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  expect(
    (await page.locator('label[for=preview-hints]').boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await context.close();
});

test('action menu escapes clipping and keeps disabled-item keyboard skipping', async ({ page }) => {
  await page.goto('/#/design-system');
  const trigger = page.getByRole('button', { name: /Example actions/ });
  await trigger.evaluate((el) => {
    const parent = el.parentElement!;
    parent.style.overflow = 'hidden';
    parent.style.maxHeight = '44px';
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((el) => el.closest('[role=region]')?.parentElement === document.body),
  ).toBe(true);
  await expect(page.getByRole('menuitem', { name: 'Show feedback' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Clear feedback' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
