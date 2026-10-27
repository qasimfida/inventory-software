import { expect, test } from '@playwright/test';

test('badges, shell text and sync toast follow shape, text size and effects preferences', async ({
  page,
}) => {
  await page.goto('/#/design-system');
  const badge = page.locator('[data-tone="warning"]').first();
  await expect(badge).toBeVisible();
  for (const radius of ['rounded', 'circle']) {
    const result = await page.evaluate((radius) => {
      const root = document.documentElement;
      root.dataset.radius = radius;
      root.dataset.textSize = 'large';
      root.dataset.effects = 'false';
      // Probe the actual feature CSS without fetching private account/task data.
      const probe = document.createElement('div');
      probe.className = 'sync-toast';
      probe.textContent = 'Synchronization complete';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const shadow = style.boxShadow;
      const color = style.color;
      probe.remove();
      const badge = document.querySelector('[data-tone="warning"]')!;
      return {
        shadow,
        color,
        radius: parseFloat(getComputedStyle(badge).borderRadius),
        expectedRadius: parseFloat(
          getComputedStyle(root).getPropertyValue(
            radius === 'circle' ? '--radius-circle' : '--radius',
          ),
        ),
        fontSize: parseFloat(getComputedStyle(badge).fontSize),
      };
    }, radius);
    expect(result.shadow).toBe('none');
    expect(result.radius).toBe(result.expectedRadius);
    expect(result.fontSize).toBeCloseTo(12 * 1.2);
  }
});

test('supported font families reach forms, tables and overlay text', async ({ page }) => {
  await page.goto('/#/design-system');
  await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible();
  for (const family of ['Karla', 'Lora', 'system-ui', 'Georgia', 'monospace']) {
    await page.evaluate(
      (family) => document.documentElement.style.setProperty('--font-family-sans', family),
      family,
    );
    for (const target of [
      page.locator('h1'),
      page.getByLabel('Preview label', { exact: true }),
      page.locator('table').first(),
    ])
      expect(await target.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(family);
    await page.getByRole('button', { name: /Example actions/ }).click();
    expect(
      await page.getByRole('menu').evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain(family);
    await page.keyboard.press('Escape');
  }
});
