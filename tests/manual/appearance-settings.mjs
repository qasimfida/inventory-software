/* global document, getComputedStyle, innerWidth */
import { expect } from '@playwright/test';

// Use only the disposable account created by organization.mjs; restore its original values.
export async function exerciseAppearanceSettings(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const fields = [
    ['Account appearance', ['light', 'dark', 'system'], 'theme'],
    ['Theme color', ['default', 'teal'], 'accent'],
    ['Animation', ['enabled', 'reduced', 'disabled'], 'motion'],
    ['Spacing', ['comfortable', 'compact'], 'density'],
    ['Text size', ['small', 'medium', 'large'], 'textSize'],
    ['Font', ['system'], null],
    ['Loading and empty state style', ['simple', 'enhanced'], 'states'],
    ['Visualization detail', ['simple', 'enhanced'], null],
  ];
  const original = [];
  for (const [label, values, attribute] of fields) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toBeEnabled();
    original.push([label, await field.inputValue()]);
    for (const value of values) {
      await field.selectOption(value);
      await expect(field).toBeEnabled();
      await expect(field).toHaveValue(value);
      if (attribute && value !== 'system')
        await expect
          .poll(() => page.evaluate((key) => document.documentElement.dataset[key], attribute))
          .toBe(value);
    }
  }
  const effects = page.getByLabel('Optional shadows and visual effects', { exact: true });
  const originalEffects = await effects.isChecked();
  for (const value of [true, false]) {
    if ((await effects.isChecked()) !== value) await effects.click();
    await expect(effects).toBeChecked({ checked: value });
    await expect(effects).toBeEnabled();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.effects))
      .toBe(String(value));
  }
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const [label, values] of fields)
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(values.at(-1));
  await page.setViewportSize({ width: 320, height: 800 });
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > innerWidth)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        text: e.textContent?.slice(0, 80),
        right: e.getBoundingClientRect().right,
      })),
  );
  expect(overflow, 'Settings large-text overflow').toEqual([]);
  expect(
    await page.locator('.type-specimen').evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBe(48);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  const sections = await nav.locator('button[aria-current], button[title]').allTextContents();
  expect(sections.length).toBe(16);
  for (const size of ['small', 'large']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const field = page.getByLabel('Text size', { exact: true });
    await field.selectOption(size);
    await expect(field).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', size);
    await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
    for (const label of sections) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await nav.getByRole('button', { name: label.trim(), exact: true }).click();
      await expect(page.getByRole('status', { name: 'Loading workspace…' })).not.toBeVisible();
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
            message: `${label} ${size} compact teal at ${width}px`,
          })
          .toBe(width);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const [label, value] of original) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toBeEnabled();
    await field.selectOption(value);
    await expect(field).toBeEnabled();
  }
  if ((await effects.isChecked()) !== originalEffects) await effects.click();
  await expect(effects).toBeChecked({ checked: originalEffects });
  await expect(effects).toBeEnabled();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  console.log(
    'PASS every existing appearance/performance preference through real settings API, reload, all 16 sections at small/large text and 320/768/1440px, and restoration',
  );
}
