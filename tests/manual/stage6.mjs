import { expectFacts } from './record-facts.mjs';
/* global document, window */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exerciseStage6(page) {
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  await nav.getByRole('button', { name: 'Business trading', exact: true }).click();
  const trading = page.getByRole('region', { name: 'Business trading', exact: true });
  await expect(trading.getByText('No shared orders on this page.')).toBeVisible();
  await expect(
    trading.getByRole('form', { name: 'Invite trading partner', exact: true }),
  ).toBeVisible();
  await nav.getByRole('button', { name: 'Accounting', exact: true }).click();
  const accounting = page.getByRole('region', { name: 'Accounting', exact: true });
  const period = accounting.getByRole('form', { name: 'Create accounting period', exact: true });
  await period.getByLabel('Period starts (YYYY-MM-DD)', { exact: true }).fill('2025-01-01');
  await period.getByLabel('Period ends (YYYY-MM-DD)', { exact: true }).fill('2025-12-31');
  await period.getByRole('button', { name: 'Create accounting period', exact: true }).click();
  await expect(
    accounting.getByText('Period 2025-01-01 — 2025-12-31 · open', { exact: true }),
  ).toBeVisible();
  const journal = accounting.getByRole('form', {
    name: 'Confirm balanced manual journal',
    exact: true,
  });
  await journal.getByLabel('Posting date (YYYY-MM-DD)', { exact: true }).fill('2025-01-02');
  await journal.getByLabel('Journal currency', { exact: true }).selectOption('USD');
  await journal.getByLabel('Debit account', { exact: true }).selectOption('1000');
  await journal.getByLabel('Credit account', { exact: true }).selectOption('3000');
  await journal.getByLabel('Amount in minor units', { exact: true }).fill('9007199254740993');
  await journal
    .getByLabel('Journal reason (at least 10 characters)', { exact: true })
    .fill('Browser opening balance');
  await journal
    .getByRole('button', { name: 'Confirm balanced manual journal', exact: true })
    .click();
  await expect(
    accounting.getByText('1000: debit 9007199254740993, credit 0', { exact: true }),
  ).toBeVisible();
  const reverse = accounting.getByRole('form', { name: 'Confirm journal reversal', exact: true });
  await reverse.getByLabel('Reversal date (YYYY-MM-DD)', { exact: true }).fill('2025-01-03');
  await reverse
    .getByLabel('Correction reason (at least 10 characters)', { exact: true })
    .fill('Browser reviewed correction');
  await reverse.getByRole('button', { name: 'Confirm journal reversal', exact: true }).click();
  await expectFacts(
    accounting
      .getByLabel('Trial balance account', { exact: true })
      .filter({ has: page.getByText('1000', { exact: true }) }),
    {
      Account: '1000',
      Currency: 'USD',
      'Debit (minor units)': '9007199254740993',
      'Credit (minor units)': '9007199254740993',
    },
  );
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.evaluate(axe.source);
  expect(
    await page.evaluate(async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Accounting"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => v.id),
    ),
  ).toEqual([]);
  if (!(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)))
    console.log(
      'Overflow elements',
      await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter((e) => e.getBoundingClientRect().right > window.innerWidth)
          .slice(-10)
          .map((e) => ({
            tag: e.tagName,
            classes: e.className,
            width: e.getBoundingClientRect().width,
          })),
      ),
    );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1280, height: 1000 });
  await nav.getByRole('button', { name: 'Integrations & help', exact: true }).click();
  const integrations = page.getByRole('region', {
    name: 'Integrations and navigation help',
    exact: true,
  });
  await expect(integrations.getByText(/ai: unconfigured/)).toBeVisible();
  await expect(integrations.getByLabel('Navigation question')).toHaveCount(0);
  await expect(integrations.getByText('Sales and receipts', { exact: true })).toBeVisible();
  console.log(
    'PASS Stage 6: lazy trading, exact journals/reversal, 320px accessibility, honest integration status',
  );
}
