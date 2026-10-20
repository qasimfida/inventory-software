import { expect } from '@playwright/test';
export async function exerciseInventory(page) {
  const movement = page.getByRole('form', { name: 'Post stock movement', exact: true });
  await movement.getByLabel('Movement quantity', { exact: true }).fill('10');
  await movement.getByLabel('Movement type', { exact: true }).selectOption('opening');
  await movement
    .getByLabel('Reason / source reference', { exact: true })
    .fill('Browser opening count');
  await movement.getByRole('button', { name: 'Post stock movement', exact: true }).click();
  await expect(page.getByText(/BROWSER-SKU · Main warehouse · on hand 10.000000/)).toBeVisible();
  const reserve = page.getByRole('form', { name: 'Reserve stock', exact: true });
  await reserve.getByLabel('Movement quantity', { exact: true }).fill('2');
  await reserve
    .getByLabel('Reason / source reference', { exact: true })
    .fill('Browser reservation');
  await reserve.getByRole('button', { name: 'Reserve stock', exact: true }).click();
  await expect(
    page.getByText(/reserved 2.000000 · damaged 0.000000 · available 8.000000/),
  ).toBeVisible();
  const release = page.getByRole('form', { name: 'Release reservation', exact: true });
  await release.getByLabel('Release reason', { exact: true }).fill('Browser release');
  await release.getByRole('button', { name: 'Release reservation', exact: true }).click();
  await expect(
    page.getByText(/reserved 0.000000 · damaged 0.000000 · available 10.000000/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reconcile inventory', exact: true }).click();
  await expect(page.getByText('Ledger and balances reconcile.', { exact: true })).toBeVisible();
  console.log('PASS real browser stock opening, reservation, release and reconciliation');
}
