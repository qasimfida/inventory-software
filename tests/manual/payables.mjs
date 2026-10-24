import { expectFacts, expectShift } from './record-facts.mjs';
/* global window, document */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exercisePayables(page) {
  await page.getByRole('button', { name: 'Open point of sale', exact: true }).click();
  await page
    .getByLabel('Checkout warehouse', { exact: true })
    .selectOption({ label: 'Main warehouse' });
  await page.getByRole('button', { name: 'Cash shifts / sale history', exact: true }).click();
  const shift = page.getByRole('form', { name: 'Open cash shift', exact: true });
  await shift.getByLabel('Opening float (minor units)', { exact: true }).fill('5000');
  await shift.getByRole('button', { name: 'Open cash shift', exact: true }).click();
  await expectShift(page, { Expected: '5000' });
  await page.getByRole('button', { name: 'Back to management', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Supplier balances', exact: true })
    .click();
  const panel = page.getByRole('region', { name: 'Supplier balances', exact: true });
  await panel
    .getByLabel('Supplier balances warehouse', { exact: true })
    .selectOption({ label: 'Main warehouse' });
  await panel.getByRole('button', { name: 'Refresh supplier balances', exact: true }).click();
  await panel.getByRole('button', { name: 'View invoice BROWSER-INV', exact: true }).click();
  const pay = panel.getByRole('form', { name: 'Record supplier cash payment', exact: true });
  await pay.getByLabel('Cash paid (USD minor units)', { exact: true }).fill('2500');
  await pay.getByLabel('Supplier cash receipt reference', { exact: true }).fill('BROWSER-SUP-PAY');
  await pay.getByRole('button', { name: 'Record supplier cash payment', exact: true }).click();
  await expectFacts(panel.getByLabel('Invoice balances', { exact: true }), {
    Original: '2500',
    Credits: '0',
    'Cash paid': '2500',
  });
  const credit = panel.getByRole('form', {
    name: 'Record confirmed supplier return credit',
    exact: true,
  });
  await credit.getByLabel('Agreed supplier credit (USD minor units)', { exact: true }).fill('1250');
  await credit
    .getByLabel('Supplier credit note reference', { exact: true })
    .fill('BROWSER-CR-1250');
  await credit
    .getByLabel('Supplier credit reason', { exact: true })
    .fill('Supplier confirmed original returned unit');
  await credit
    .getByRole('button', { name: 'Record confirmed supplier return credit', exact: true })
    .click();
  const refund = panel.getByRole('form', { name: 'Record cash refund from supplier', exact: true });
  await refund.getByLabel('Cash received (USD minor units)', { exact: true }).fill('1250');
  await refund
    .getByLabel('Supplier cash receipt reference', { exact: true })
    .fill('BROWSER-SUP-REFUND');
  await refund
    .getByRole('button', { name: 'Record cash refund from supplier', exact: true })
    .click();
  await expectFacts(panel.getByLabel('Invoice balances', { exact: true }), {
    Original: '2500',
    Credits: '1250',
    'Cash paid': '2500',
    'Cash refunded': '1250',
    Outstanding: '0',
  });
  await page.evaluate(axe.source);
  expect(
    await page.evaluate(async () =>
      (
        await window.axe.run(document.querySelector('[aria-label="Supplier balances"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => v.id),
    ),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Open point of sale', exact: true }).click();
  await page
    .getByLabel('Checkout warehouse', { exact: true })
    .selectOption({ label: 'Main warehouse' });
  await page.getByRole('button', { name: 'Cash shifts / sale history', exact: true }).click();
  await expectShift(page, { Expected: '3750' });
  const close = page.getByRole('form', { name: /^Close cash shift / });
  await close.getByLabel('Counted cash (minor units)', { exact: true }).fill('3750');
  await close.getByRole('button', { name: /^Close cash shift / }).click();
  await expectShift(page, { Expected: '3750', Counted: '3750', Discrepancy: '0' });
  await page.getByRole('button', { name: 'Back to management', exact: true }).click();
  console.log(
    'PASS browser supplier invoice, cash payment, linked return credit, cash refund and payable accessibility',
  );
}
