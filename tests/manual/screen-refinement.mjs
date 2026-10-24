/* global document, window */
import { expect } from '@playwright/test';
import axe from 'axe-core';

// Runs after real transactions have been created by organization.mjs. No fixture screen data.
export async function exerciseScreenRefinement(page) {
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const sections = await nav.locator('button[aria-current], button[title]').allTextContents();
  expect(sections.length).toBe(16);
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Account appearance', { exact: true }).selectOption(theme);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe(theme);
    await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
    for (const label of sections) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await nav.getByRole('button', { name: label.trim(), exact: true }).click();
      await expect(nav.getByRole('button', { name: label.trim(), exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByText('Loading workspace…', { exact: true })).not.toBeVisible();
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
            message: `${label} ${theme} at ${width}px`,
          })
          .toBe(width);
      }
      await page.evaluate(axe.source);
      const failures = await page.evaluate(async () =>
        (
          await window.axe.run(document.querySelector('.workspace-content'), {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      );
      expect(failures, `${label} ${theme} accessibility`).toEqual([]);
      if (['Purchasing', 'Inventory', 'Supplier balances', 'Customers'].includes(label.trim())) {
        await page.screenshot({
          path: `test-results/screen-${label.trim().toLowerCase().replaceAll(' ', '-')}-${theme}-320.png`,
          fullPage: true,
        });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  console.log(
    'PASS all 16 workspace sections: real data, light/dark, 320/768/1440px overflow, WCAG checks',
  );
}
