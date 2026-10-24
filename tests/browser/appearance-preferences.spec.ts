import { test, expect } from '@playwright/test';

test('resolved preferences scale the hierarchy, preserve targets and disable all elevations', async ({
  page,
}) => {
  await page.goto('/#/design-system');
  const title = page.getByRole('heading', { level: 1 });
  const button = page.getByRole('button', { name: 'Primary example', exact: true });
  const input = page.getByRole('textbox', { name: /Preview label/ });
  expect(await button.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('box-shadow');
  expect(await input.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('box-shadow');
  expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe('28px');
  expect(await input.evaluate((el) => getComputedStyle(el).fontSize)).toBe('14px');
  for (const [size, scale] of [
    ['small', 0.9],
    ['medium', 1],
    ['large', 1.2],
  ] as const) {
    await page.evaluate((textSize) => {
      document.documentElement.dataset.textSize = textSize;
      document.documentElement.dataset.density = 'compact';
    }, size);
    expect(await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(
      28 * scale,
    );
    expect(await button.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(
      14 * scale,
    );
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(36);
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.evaluate(() => {
    document.documentElement.dataset.effects = 'false';
    document.documentElement.dataset.accent = 'teal';
  });
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe('rgb(15, 118, 110)');
  const outline = page.getByRole('button', { name: /A longer action label/ });
  expect(await outline.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  await page.getByRole('button', { name: /Example actions/ }).click();
  expect(await page.getByRole('menu').evaluate((el) => getComputedStyle(el).boxShadow)).toBe(
    'none',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset example' }).click();
  expect(await page.getByRole('alertdialog').evaluate((el) => getComputedStyle(el).boxShadow)).toBe(
    'none',
  );
});

test('disabled motion and OS reduction beat component animation, transitions and pseudo elements', async ({
  page,
}) => {
  await page.goto('/#/design-system');
  const button = page.getByRole('button', { name: 'Primary example', exact: true });
  await expect(button).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'enabled');
  await page.addStyleTag({
    content: `
      @keyframes probe { to { opacity: .5; } }
      html::before, [data-slot=button], [data-slot=button]::after {
        animation: probe 2s infinite; transition: all 3s; scroll-behavior: smooth;
      }
      [data-slot=button]::after { content: ''; }
    `,
  });
  for (const motion of ['disabled', 'reduced', 'enabled']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.motion = value;
    }, motion);
    if (motion === 'enabled') await page.emulateMedia({ reducedMotion: 'reduce' });
    const styles = await button.evaluate((el) =>
      [
        getComputedStyle(el),
        getComputedStyle(el, '::after'),
        getComputedStyle(document.documentElement, '::before'),
      ].map((s) => ({
        animation: s.animationName,
        transition: s.transitionDuration,
        scroll: s.scrollBehavior,
      })),
    );
    expect(styles, motion).toEqual([
      { animation: 'none', transition: '0s', scroll: 'auto' },
      { animation: 'none', transition: '0s', scroll: 'auto' },
      { animation: 'none', transition: '0s', scroll: 'auto' },
    ]);
  }
});
