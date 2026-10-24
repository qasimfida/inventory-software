import { test, expect } from '@playwright/test';
import axe from 'axe-core';
for (const width of [320, 1440]) {
  test(`isolated sign-in and system themes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/api/v1/auth/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }),
      }),
    );
    await page.goto('/#/');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Appearance', { exact: true })).not.toBeVisible();
    expect((await page.locator('.auth-card').boundingBox())!.width).toBeLessThanOrEqual(432);
    await expect(page.getByText('Settings', { exact: true })).toHaveCount(0);
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate(axe.source);
      expect(
        await page.evaluate(async () =>
          (
            await (window as typeof window & { axe: typeof axe }).axe.run(
              document.querySelector('main')!,
              {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
              },
            )
          ).violations.map((v) => v.id),
        ),
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
}
