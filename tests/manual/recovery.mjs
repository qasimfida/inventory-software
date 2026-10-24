/* global window, document */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import axe from 'axe-core';

export async function exerciseRecovery(browser, email) {
  assert.equal(process.env.NODE_ENV, 'test', 'Recovery E2E requires an isolated test environment.');
  assert.ok(process.env.DATABASE_URL, 'Recovery E2E requires the disposable API database.');
  let resetToken;
  try {
    const output = execFileSync(process.execPath, ['apps/api/dist/auth/admin-cli.js'], {
      input: JSON.stringify({ action: 'recover', email }),
      encoding: 'utf8',
    });
    resetToken = JSON.parse(output).resetToken;
  } catch {
    throw new Error('Test operator could not issue a recovery code.');
  }
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(process.env.E2E_WEB_URL);
    await page.getByText('Forgot password / recovery code', { exact: true }).click();
    await page.evaluate(axe.source);
    assert.deepEqual((await page.evaluate(async () => window.axe.run(document))).violations, []);
    await page.getByLabel('Recovery account email').fill(email);
    await page.getByLabel('Recovery code', { exact: true }).fill(resetToken);
    const password = 'browser recovered test passphrase';
    await page.getByLabel('New password (15–128 characters)').fill(password);
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    await expect(page.getByText(/Password reset. All online sessions ended/)).toBeVisible();
    await expect(page.getByLabel('Recovery code', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('New password (15–128 characters)')).toHaveValue('');
    await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toHaveCount(0);
    await page.getByLabel('Account email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Workspace overview' })).toBeVisible();
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    console.log(
      'PASS operator-issued recovery, real browser reset, explicit fresh login, secret clearing and axe checks',
    );
  } finally {
    await context.close();
  }
}
