import { test, expect } from '@playwright/test';
test('account accents visibly update primary actions and active navigation in both themes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Account email')).toBeHidden();
  await page.evaluate(() => {
    location.hash = '/settings/preferences';
  });
  await expect(page.getByRole('radio', { name: 'violet', exact: true })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme, exact: true }).locator('..').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const values: string[] = [];
    for (const accent of ['teal', 'violet', 'rose', 'amber', 'Blue']) {
      const radio = page.getByRole('radio', { name: accent, exact: true });
      await expect(radio).toBeEnabled();
      await radio.click();
      await expect(radio).toBeChecked();
      await expect(page.locator('html')).toHaveAttribute(
        'data-accent',
        accent === 'Blue' ? 'default' : accent,
      );
      const result = await page.evaluate(() => {
        const probe = document.createElement('button');
        probe.style.backgroundColor = 'var(--primary)';
        document.body.append(probe);
        const primary = getComputedStyle(probe).backgroundColor;
        probe.style.backgroundColor = 'var(--navigation-selected)';
        const navigation = getComputedStyle(probe).backgroundColor;
        probe.style.backgroundColor = 'var(--destructive)';
        const error = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { primary, navigation, error };
      });
      expect(result.navigation).toBe(result.primary);
      expect(result.error).not.toBe(result.primary);
      values.push(result.primary);
    }
    expect(new Set(values).size).toBe(5);
    await page.screenshot({ path: `artifacts/qa/currency-palette/palette-${theme}.png` });
  }
});
