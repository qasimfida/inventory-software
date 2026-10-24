import { chooseSelect } from './select-control';
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import type axe from 'axe-core';

const require = createRequire(import.meta.url);
for (const mode of ['light', 'dark'] as const) {
  for (const width of [320, 1440]) {
    test(`${mode} foundation layout and accessibility at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/#/design-system');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design system');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();

      await chooseSelect(page, 'Appearance', mode);
      await expect(page.getByRole('textbox', { name: /Preview label/ })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const documentation = page.getByText('Component usage documentation', { exact: true });
      await documentation.click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await documentation.click();
      const navigation = await page
        .getByRole('navigation', { name: 'Example navigation' })
        .boundingBox();
      const selectedSection = await page.getByText('Selected example section: first').boundingBox();
      expect(navigation).not.toBeNull();
      expect(selectedSection).not.toBeNull();
      expect(navigation!.y + navigation!.height).toBeLessThanOrEqual(selectedSection!.y);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => {
        const browser = window as typeof window & { axe: typeof axe };
        return (await browser.axe.run(document)).violations;
      });
      expect(violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`foundation-${mode}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Update preview' }).click();
      await expect(
        page.getByRole('alert').filter({ hasText: 'Please correct the following:' }),
      ).toBeFocused();
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
}

test('system appearance follows OS changes and explicit choices stay view-local', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/design-system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseSelect(page, 'Appearance', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await chooseSelect(page, 'Appearance', 'system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
