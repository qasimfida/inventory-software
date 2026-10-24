import { chromium, expect } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' }),
  p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await p.goto('http://127.0.0.1:5188');
  await p.getByLabel('Account email').fill('owner@demo.example.test');
  await p.getByLabel('Password', { exact: true }).fill('local-demo');
  await p.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(p.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
  const group = p.locator('.sidebar-group').first().getByRole('button').first();
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await p.getByRole('button', { name: 'Collapse sidebar' }).click();
  await p.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await group.click();
  await p.getByRole('button', { name: 'Switch workspace' }).click();
  await expect(p.locator('.workspace-menu input[type=checkbox]')).toHaveCount(0);
  await p.getByRole('button', { name: /Reserve warehouse/ }).click();
  await expect(p.getByRole('region', { name: 'Business dashboard' })).toBeVisible();
  await p.getByRole('button', { name: 'Open profile menu' }).click();
  await p.getByRole('menuitem', { name: 'Theme', exact: true }).focus();
  await p.keyboard.press('ArrowRight');
  await expect(p.getByRole('menuitem', { name: 'Light', exact: true })).toBeVisible();
  await p.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
  await p.screenshot({ path: 'docs/qa/navigation-refinement/sidebar-theme.png' });
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: 'Theme and colors' }).click();
  await expect(p.getByRole('button', { name: 'System', exact: true })).toBeVisible();
  await p.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
  await p.screenshot({ path: 'docs/qa/navigation-refinement/header-theme.png' });
  console.log('Workspace single-location selection and both theme popups passed');
} finally {
  await b.close();
}
