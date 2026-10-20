/* global window, document */
import { expect } from '@playwright/test';
import axe from 'axe-core';
export async function exerciseCommerce(page) {
  await page.getByRole('button', { name: 'Open point of sale', exact: true }).click();
  await page
    .getByLabel('Checkout warehouse', { exact: true })
    .selectOption({ label: 'Main warehouse' });
  const tools = page.getByRole('button', { name: 'Cash shifts / sale history', exact: true });
  async function cart(customer = false, cash = '1250') {
    await page
      .getByRole('button', { name: 'Add BROWSER-SKU · Browser product', exact: true })
      .click();
    if (customer)
      await page
        .getByLabel('Checkout customer', { exact: true })
        .selectOption({ label: 'BROWSER-CUSTOMER · Browser customer' });
    await page.getByRole('button', { name: 'Calculate checkout total', exact: true }).click();
    const form = page.getByRole('form', { name: 'Complete cash / credit sale', exact: true });
    await form.getByLabel('Cash applied (minor units)', { exact: true }).fill(cash);
    await form.getByLabel('Cash tendered (minor units)', { exact: true }).fill(cash);
    return form;
  }
  let form = await cart();
  await form.getByRole('button', { name: 'Complete cash / credit sale', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await tools.click();
  const open = page.getByRole('form', { name: 'Open cash shift', exact: true });
  await open.getByLabel('Cash currency', { exact: true }).selectOption('USD');
  await open.getByLabel('Opening float (minor units)', { exact: true }).fill('10000');
  await open.getByRole('button', { name: 'Open cash shift', exact: true }).click();
  await expect(page.getByText(/expected 10000 · counted/)).toBeVisible();
  await tools.click();
  await page.getByRole('button', { name: 'Calculate checkout total', exact: true }).click();
  await page.getByRole('button', { name: 'Complete cash / credit sale', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sale completed:' })).toBeVisible();
  async function receipt() {
    await tools.click();
    const select = page.getByLabel('Sale receipt', { exact: true });
    await expect(select.locator('option')).not.toHaveCount(1);
    await select.selectOption({ index: 1 });
    await expect(page.getByText(/Financial reconciliation: matched/)).toBeVisible();
  }
  async function returnAll() {
    const correction = page.getByRole('form', { name: 'Return all remaining lines', exact: true });
    await correction
      .getByLabel('Full return explanation', { exact: true })
      .fill('Browser full return');
    await correction
      .getByRole('button', { name: 'Return all remaining lines', exact: true })
      .click();
    await expect(page.getByText(/Status: returned/)).toBeVisible();
    await expect(page.getByText(/Financial reconciliation: matched/)).toBeVisible();
  }
  await receipt();
  await returnAll();
  await tools.click();
  form = await cart(true, '500');
  await form.getByRole('button', { name: 'Complete cash / credit sale', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sale completed:' })).toBeVisible();
  await receipt();
  await expect(page.getByText(/Outstanding: USD 7.50/)).toBeVisible();
  await returnAll();
  await expect(page.getByText(/credit USD 7.50, cash refund USD 5.00/)).toBeVisible();
  await tools.click();
  form = await cart(true, '0');
  await form.getByRole('button', { name: 'Complete cash / credit sale', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sale completed:' })).toBeVisible();
  await receipt();
  await expect(page.getByText(/Outstanding: USD 12.50/)).toBeVisible();
  await returnAll();
  await page.getByRole('button', { name: 'Refresh cash shifts', exact: true }).click();
  const close = page.getByRole('form', { name: /^Close cash shift / });
  await close.getByLabel('Counted cash (minor units)', { exact: true }).fill('9999');
  await close.getByRole('button', { name: /^Close cash shift / }).click();
  await expect(page.getByText(/expected 10000 · counted 9999 · discrepancy -1/)).toBeVisible();
  await page.evaluate(axe.source);
  const issues = await page.evaluate(async () =>
    (
      await window.axe.run(document.querySelector('[aria-label="Point of sale"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    ).violations.map((v) => v.id),
  );
  expect(issues).toEqual([]);
  await page.getByRole('button', { name: 'Back to management', exact: true }).click();
  await page.getByRole('button', { name: 'Reconcile inventory', exact: true }).click();
  await expect(page.getByText('Ledger and balances reconcile.', { exact: true })).toBeVisible();
  console.log(
    'PASS real browser failed checkout without shift, cash sale, split cash/credit, full credit, receipts, returns/refunds, shift discrepancy, inventory reconciliation and POS axe checks',
  );
}
