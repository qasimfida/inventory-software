import { expect } from '@playwright/test';
export async function exerciseStorage(page) {
  const form = page.getByRole('form', { name: 'Create storage location', exact: true });
  await form.getByLabel('Location name', { exact: true }).fill('Browser bin');
  await form.getByLabel('Location code', { exact: true }).fill('BIN-BROWSER');
  await form.getByRole('button', { name: 'Create storage location', exact: true }).click();
  await expect(page.getByText(/Browser bin · bin · active/)).toBeVisible();
  const move = page.getByRole('form', { name: 'Move stock between locations', exact: true });
  await move
    .getByLabel('Source storage location', { exact: true })
    .selectOption({ label: 'ROOT · Main warehouse' });
  await move
    .getByLabel('Destination storage location', { exact: true })
    .selectOption({ label: 'BIN-BROWSER · Browser bin' });
  await move.getByLabel('Move quantity', { exact: true }).fill('2');
  await move.getByLabel('Move reason', { exact: true }).fill('Browser putaway');
  await move.getByRole('button', { name: 'Move stock between locations', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh inventory', exact: true }).click();
  await expect(page.getByText(/BROWSER-SKU · Browser bin · on hand 2.000000/)).toBeVisible();
  console.log('PASS real browser storage creation, label and ledger-backed bin movement');
}
