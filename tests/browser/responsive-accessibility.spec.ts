import { chooseSelect } from './select-control';
import { expect, test } from '@playwright/test';

for (const width of [320, 768]) {
  test(`collapsed navigation preserves keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/#/design-system');
    const navigation = page.getByRole('navigation', { name: 'Example icon rail' });
    const trigger = navigation.getByRole('button', { name: /Workspace menu:/ });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-controls', /.+/);
    await page.keyboard.press('Tab');
    await expect(
      navigation.getByRole('button', { name: 'First section', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await navigation.getByRole('button', { name: 'Second section', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText('Selected example section: second')).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 600 });
    await expect(
      navigation.getByRole('button', { name: 'Second section', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(
      navigation.getByRole('button', { name: 'Second section', exact: true }),
    ).toBeFocused();
  });
}

test('200% text remains readable in short viewport menus and dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto('/#/design-system');
  await expect(page.getByRole('button', { name: 'Primary example', exact: true })).toBeVisible();
  for (const appearance of ['light', 'dark']) {
    await chooseSelect(page, 'Appearance', appearance);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
      document.documentElement.style.setProperty('--text-scale', '2');
    });
    const trigger = page.getByRole('button', { name: /Example actions/ });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Clear feedback' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.getByRole('button', { name: 'Reset example' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Reset example' })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});

test('resizing a focused desktop rail to mobile leaves focus on a visible control', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/#/design-system');
  const nav = page.getByRole('navigation', { name: 'Example icon rail' });
  await nav.getByRole('button', { name: 'Second section', exact: true }).focus();
  await page.setViewportSize({ width: 640, height: 360 });
  await expect(nav.getByRole('button', { name: /Workspace menu:/ })).toBeFocused();
  await expect(nav.getByRole('button', { name: /Workspace menu:/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.setViewportSize({ width: 1440, height: 600 });
  await nav.getByRole('button', { name: 'First section', exact: true }).focus();
  const otherControl = page.getByRole('button', { name: 'Primary example', exact: true });
  await otherControl.focus();
  await page.setViewportSize({ width: 640, height: 360 });
  await expect(otherControl).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(otherControl).toBeFocused();
});
