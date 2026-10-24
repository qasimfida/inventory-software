/* global document */
import { expect } from '@playwright/test';

// Existing real-data fixture; presentation stress only, no account preference writes.
export async function exerciseResponsiveAccessibility(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  const sections = await nav.locator('button[aria-current], button[title]').allTextContents();
  expect(sections.length).toBe(16);
  const previous = await page.evaluate(() => ({
    size: document.documentElement.style.fontSize,
    scale: document.documentElement.style.getPropertyValue('--text-scale'),
  }));
  try {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
      document.documentElement.style.setProperty('--text-scale', '2');
    });
    for (const section of sections) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await nav.getByRole('button', { name: section.trim(), exact: true }).click();
      await expect(page.getByRole('status', { name: 'Loading workspace…' })).not.toBeVisible();
      for (const [width, height] of [
        [320, 480],
        [640, 360],
        [1024, 600],
        [2560, 1440],
      ]) {
        await page.setViewportSize({ width, height });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
            message: `${section} at 200% text, ${width}×${height}`,
          })
          .toBe(width);
      }
    }
  } finally {
    await page.evaluate(({ size, scale }) => {
      document.documentElement.style.fontSize = size;
      if (scale) document.documentElement.style.setProperty('--text-scale', scale);
      else document.documentElement.style.removeProperty('--text-scale');
    }, previous);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  console.log(
    'PASS all 16 sections at 200% text: 320×480, landscape 640×360, narrow desktop 1024×600 and 2560×1440; no account writes',
  );
}
