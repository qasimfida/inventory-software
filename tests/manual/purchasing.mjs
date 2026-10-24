import { expectFacts } from './record-facts.mjs';
import { expect } from '@playwright/test';
export async function exercisePurchasing(page) {
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Purchasing', exact: true })
    .click();
  const supplier = page.getByRole('form', { name: 'Create supplier', exact: true });
  await supplier.getByLabel('Supplier name', { exact: true }).fill('Browser supplier');
  await supplier.getByLabel('Supplier code', { exact: true }).fill('BROWSER-SUP');
  await supplier.getByRole('button', { name: 'Create supplier', exact: true }).click();
  const purchase = page.getByRole('form', { name: 'Create purchase order', exact: true });
  await expect(purchase.getByLabel('Supplier', { exact: true }).locator('option')).toHaveCount(1);
  await purchase.getByLabel('Purchase reference', { exact: true }).fill('BROWSER-PO');
  await purchase.getByLabel('Order quantity', { exact: true }).fill('4');
  await purchase.getByLabel('Unit cost', { exact: true }).fill('12.50');
  await purchase.getByRole('button', { name: 'Create purchase order', exact: true }).click();
  await page
    .getByLabel('Purchase order', { exact: true })
    .selectOption({ label: 'BROWSER-PO · draft' });
  for (const action of ['approve', 'order']) {
    const form = page.getByRole('form', { name: `${action} purchase BROWSER-PO`, exact: true });
    await form.getByLabel('Transition reason', { exact: true }).fill('Browser approval');
    await form.getByRole('button', { name: `${action} purchase BROWSER-PO`, exact: true }).click();
  }
  const receipt = page.getByRole('form', { name: 'Receive purchase delivery', exact: true });
  await receipt.getByLabel('Delivery quantity', { exact: true }).fill('2');
  await receipt.getByRole('button', { name: 'Receive purchase delivery', exact: true }).click();
  await expectFacts(page.getByLabel('Purchase document', { exact: true }), {
    Reference: 'BROWSER-PO',
    State: 'partially_received',
    Currency: 'USD',
  });
  const returns = page.getByRole('form', { name: 'Return received goods', exact: true });
  await returns.getByLabel('Return quantity', { exact: true }).fill('1');
  await returns.getByLabel('Return reason', { exact: true }).fill('Packaging defect');
  await returns.getByLabel('Supplier credit reference', { exact: true }).fill('BROWSER-CR');
  await returns.getByRole('button', { name: 'Return received goods', exact: true }).click();
  await expectFacts(page.getByLabel('Supplier return', { exact: true }), {
    'Return quantity': '1.000000',
    'Damaged quantity': '0.000000',
    'Credit reference': 'BROWSER-CR',
  });
  const invoice = page.getByRole('form', {
    name: 'Record supplier invoice reference',
    exact: true,
  });
  await invoice.getByLabel('Invoice reference', { exact: true }).fill('BROWSER-INV');
  await invoice.getByLabel('Invoice amount in USD minor units', { exact: true }).fill('2500');
  await invoice.getByLabel('Due date (YYYY-MM-DD)', { exact: true }).fill('2026-12-31');
  await invoice
    .getByRole('button', { name: 'Record supplier invoice reference', exact: true })
    .click();
  console.log(
    'PASS real browser supplier, purchase approval, partial receiving and supplier return',
  );
}
