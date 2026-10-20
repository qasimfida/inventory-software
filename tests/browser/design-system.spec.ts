import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import type axe from 'axe-core';

const require = createRequire(import.meta.url);
for (const width of [320, 1440]) {
  test(`foundation layout and accessibility at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventory platform');
    await expect(page.getByRole('textbox', { name: /Preview label/ })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const browser = window as typeof window & { axe: typeof axe };
      return (await browser.axe.run(document)).violations;
    });
    expect(violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`foundation-${width}.png`), fullPage: true });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.getByRole('button', { name: 'Update preview' }).click();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.getByRole('button', { name: 'Enter a preview label.' }).click();
    await expect(page.getByRole('textbox', { name: /Preview label/ })).toBeFocused();
    await page.getByRole('button', { name: 'Reset example' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Reset this example?' });
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    const dialogViolations = await page.evaluate(async () => {
      const browser = window as typeof window & { axe: typeof axe };
      return (await browser.axe.run(document)).violations;
    });
    expect(dialogViolations).toEqual([]);
    expect(
      await dialog.evaluate(
        (element) => element.getBoundingClientRect().right <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Reset example' })).toBeFocused();
    const menuTrigger = page.getByRole('button', { name: /Example actions/ });
    await menuTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Show feedback' })).toBeFocused();
    const menuViolations = await page.evaluate(async () => {
      const browser = window as typeof window & { axe: typeof axe };
      return (await browser.axe.run(document)).violations;
    });
    expect(menuViolations).toEqual([]);
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Clear feedback' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menuTrigger).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await menuTrigger.evaluate((element) =>
        parseFloat(getComputedStyle(element).transitionDuration),
      ),
    ).toBeLessThan(0.001);
  });
}
