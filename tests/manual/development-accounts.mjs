// Run after migrations, db:seed:dev and starting local API/web. No business data is mutated.
import { chromium, expect } from '@playwright/test';
import {
  developmentAccounts,
  developmentPassword,
} from '../../apps/api/dist/development/fixtures.js';

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
try {
  for (const account of developmentAccounts) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5173/#/');
      await page.getByLabel('Account email', { exact: true }).fill(account.email);
      await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page.getByText(`Signed in as ${account.email}`, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText(`Signed in as ${account.email}`, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Log out', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  }
  console.log(
    'PASS: all seven development accounts log in, restore their cookie session on reload, and log out.',
  );
} finally {
  await browser.close();
}
