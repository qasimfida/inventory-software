import { test, expect } from '@playwright/test';
test('online layouts honor built-in typography, density, radius, icon size and theme tokens', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  for (const path of [
    '/online-store',
    '/online-store/products',
    '/online-store/settings/general',
  ]) {
    await page.evaluate((path) => {
      location.hash = path;
    }, path);
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible();
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        for (const font of ['Karla', 'Lora', 'system-ui', 'Georgia, serif', 'monospace'])
          for (const textSize of ['small', 'medium', 'large'])
            for (const density of ['compact', 'comfortable'])
              for (const radius of ['rounded', 'circle']) {
                await page.evaluate(
                  async (options) => {
                    Object.assign(document.documentElement.dataset, options);
                    document.documentElement.style.setProperty('--font-family-sans', options.font);
                    await new Promise(requestAnimationFrame);
                  },
                  {
                    theme,
                    font,
                    textSize,
                    density,
                    radius,
                    iconSize: textSize,
                    motion: 'disabled',
                  },
                );
                expect(
                  await page.evaluate(() => document.documentElement.scrollWidth),
                  `${path} ${width} ${theme} ${font} ${textSize} ${density} ${radius}`,
                ).toBe(width);
              }
        await page.screenshot({
          path: `artifacts/qa/screens/online-store/${path.split('/').pop()}-${width}-${theme}.png`,
          fullPage: true,
        });
      }
    }
  }
});
