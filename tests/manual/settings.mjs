/* global document, window */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exerciseSettings(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Text size', { exact: true })).toBeEnabled();
  await page.getByLabel('Text size', { exact: true }).selectOption('large');
  await expect(page.getByLabel('Text size', { exact: true })).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.textSize))
    .toBe('large');
  await page.reload();
  await expect(
    page.getByText('Signed in as browser-e2e@example.test', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.textSize))
    .toBe('large');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Text size', { exact: true })).toHaveValue('large');
  await page.getByLabel('Account appearance', { exact: true }).selectOption('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Business & access', exact: true })
    .click();
  await page.getByText('Business policy', { exact: true }).click();
  await page.getByLabel('Business enforced: Appearance', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: 'Save business policy', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Account appearance', { exact: true })).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe('light');
  await page.getByRole('button', { name: 'Security inbox', exact: true }).click();
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Security inbox', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'Security inbox', exact: true }),
        ).toBeEnabled();
        return page.getByText(/New device ·/).count();
      },
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Mark notification read', exact: true }).first().click();
  await page.getByRole('button', { name: 'My security events', exact: true }).click();
  await expect(page.getByText(/settings.preferences_changed/).first()).toBeVisible();
  await expect(page.getByText('Platform policy', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 1000 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const section = document.querySelector('[aria-label="Account settings"]');
        return section.scrollWidth <= section.clientWidth;
      }),
    )
    .toBe(true);
  await page.evaluate(axe.source);
  const violations = await page.evaluate(
    async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Account settings"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations,
  );
  expect(violations).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  // Restore presentation only; keep durable preferences/audit/notifications for reload assertions.
  await page.getByText('Business policy', { exact: true }).click();
  await page.getByLabel('Business enforced: Appearance', { exact: true }).selectOption('inherit');
  await page.getByRole('button', { name: 'Save business policy', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Account appearance', { exact: true })).toBeEnabled();
  await page.getByLabel('Text size', { exact: true }).selectOption('medium');
  await expect(page.getByLabel('Text size', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
  console.log(
    'PASS real API/browser preference reload, business enforcement, security inbox/read/audit and accessibility',
  );
}
