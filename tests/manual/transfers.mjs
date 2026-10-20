import { expect } from '@playwright/test';
export async function exerciseTransfers(page) {
  const form = page.getByRole('form', { name: 'Create transfer draft', exact: true });
  await page.getByRole('button', { name: 'Refresh transfers', exact: true }).click();
  await form.getByLabel('Transfer reference', { exact: true }).fill('BROWSER-TR');
  // Same-warehouse transfer exercises the lifecycle between two storage locations.
  const bin = await page
    .getByRole('form', { name: 'Move stock between locations', exact: true })
    .getByLabel('Destination storage location', { exact: true })
    .locator('option')
    .filter({ hasText: 'BIN-BROWSER' })
    .getAttribute('value');
  await form.getByLabel('Destination location ID (blank = root)', { exact: true }).fill(bin);
  await form.getByLabel('Transfer quantity', { exact: true }).fill('2');
  await form.getByRole('button', { name: 'Create transfer draft', exact: true }).click();
  await page
    .getByLabel('Transfer document', { exact: true })
    .selectOption({ label: 'BROWSER-TR · draft' });
  for (const action of ['approve', 'dispatch']) {
    const transition = page.getByRole('form', {
      name: `${action} transfer BROWSER-TR`,
      exact: true,
    });
    await transition
      .getByLabel('Transfer transition reason', { exact: true })
      .fill('Browser shipment');
    await transition
      .getByRole('button', { name: `${action} transfer BROWSER-TR`, exact: true })
      .click();
  }
  const receipt = page.getByRole('form', { name: 'Confirm destination receipt', exact: true });
  await receipt.getByLabel('Good received (base units)', { exact: true }).fill('1');
  await receipt.getByLabel('Receipt / discrepancy reason', { exact: true }).fill('Partial arrival');
  await receipt.getByRole('button', { name: 'Confirm destination receipt', exact: true }).click();
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^BROWSER-TR · partially_received$/ }),
  ).toBeVisible();
  await receipt.getByLabel('Damaged received (base units)', { exact: true }).fill('1');
  await receipt
    .getByLabel('Receipt / discrepancy reason', { exact: true })
    .fill('Final damaged arrival');
  await receipt.getByRole('button', { name: 'Confirm destination receipt', exact: true }).click();
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^BROWSER-TR · completed$/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reconcile inventory', exact: true }).click();
  await expect(page.getByText('Ledger and balances reconcile.', { exact: true })).toBeVisible();
  console.log(
    'PASS real browser transfer approval, dispatch, partial receipt, damage and reconciliation',
  );
}
