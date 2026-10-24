import { chooseSelect } from './select-control';
import { expect, test } from '@playwright/test';

// Full CSS cross-product; React preference/state behavior and persistence have separate coverage.
for (const width of [320, 1440]) {
  test(`supported preference combinations preserve hierarchy, fonts and overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#/design-system');
    for (const mode of ['light', 'dark', 'system'] as const) {
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
      await chooseSelect(page, 'Appearance', mode);
      const result = await page.evaluate(() => {
        const root = document.documentElement;
        const title = document.querySelector('h1')!;
        const input = document.querySelector('#preview-label') ?? document.querySelector('input');
        if (!input) throw new Error('Missing actual example input');
        const button = [...document.querySelectorAll('button')].find(
          (e) => e.textContent === 'Primary example',
        )!;
        const table = document.querySelector('table')!;
        const money = document.querySelector('td[data-numeric]')!;
        const luminance = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const channel = v / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
          return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
        };
        const failures: string[] = [];
        let checked = 0;
        for (const textSize of ['small', 'medium', 'large'])
          for (const accent of ['default', 'teal', 'violet', 'rose', 'amber'])
            for (const motion of ['enabled', 'reduced', 'disabled'])
              for (const density of ['compact', 'comfortable'])
                for (const effects of ['false', 'true']) {
                  Object.assign(root.dataset, { textSize, accent, motion, density, effects });
                  checked++;
                  const scale = textSize === 'small' ? 0.9 : textSize === 'large' ? 1.2 : 1;
                  const key = [textSize, accent, motion, density, effects].join('/');
                  if (Math.abs(parseFloat(getComputedStyle(title).fontSize) - 28 * scale) > 0.01)
                    failures.push(key + ' title');
                  if (Math.abs(parseFloat(getComputedStyle(button).fontSize) - 14 * scale) > 0.01)
                    failures.push(key + ' button');
                  if (Math.abs(parseFloat(getComputedStyle(table).fontSize) - 13 * scale) > 0.01)
                    failures.push(key + ' table');
                  if (!getComputedStyle(input).fontFamily.includes('system-ui'))
                    failures.push(key + ' font');
                  const style = getComputedStyle(button);
                  const foreground = luminance(style.color),
                    background = luminance(style.backgroundColor);
                  const contrast =
                    (Math.max(foreground, background) + 0.05) /
                    (Math.min(foreground, background) + 0.05);
                  if (contrast < 4.5) failures.push(key + ' primary contrast');
                  if (
                    getComputedStyle(root).getPropertyValue('--primary') !==
                    getComputedStyle(root).getPropertyValue('--ring')
                  )
                    failures.push(key + ' accent ring');
                  if (money.textContent !== '9007199254740993')
                    failures.push(key + ' exact amount');
                  if (root.scrollWidth > innerWidth) failures.push(key + ' overflow');
                  if (motion !== 'enabled' && getComputedStyle(button).transitionDuration !== '0s')
                    failures.push(key + ' motion');
                  if (
                    parseFloat(getComputedStyle(button).minHeight) !==
                    (density === 'compact' ? 36 : 40)
                  )
                    failures.push(key + ' target');
                }
        return { checked, failures };
      });
      expect(result.checked).toBe(180);
      expect(result.failures).toEqual([]);
    }
  });
}

test('large compact teal preferences reach portals and preserve dialog/menu keyboard access', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/#/design-system');
  for (const appearance of ['light', 'dark']) {
    await chooseSelect(page, 'Appearance', appearance);
    await page.evaluate(() =>
      Object.assign(document.documentElement.dataset, {
        textSize: 'large',
        accent: 'teal',
        density: 'compact',
        motion: 'disabled',
        effects: 'false',
      }),
    );
    await page.getByRole('button', { name: /Example actions/ }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((e) => getComputedStyle(e).boxShadow)).toBe('none');
    const box = (await menu.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reset example' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    expect(await dialog.evaluate((e) => getComputedStyle(e).fontFamily)).toContain('system-ui');
    expect(await dialog.evaluate((e) => getComputedStyle(e).boxShadow)).toBe('none');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  }
});
