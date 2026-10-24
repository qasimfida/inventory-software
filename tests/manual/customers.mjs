import { expect } from '@playwright/test';
export async function exerciseCustomers(page) {
  await page
    .getByRole('navigation', { name: 'Workspace sections' })
    .getByRole('button', { name: 'Customers', exact: true })
    .click();
  const form = page.getByRole('form', { name: 'Create customer', exact: true });
  await form.getByLabel('Customer code', { exact: true }).fill('BROWSER-CUSTOMER');
  await form.getByLabel('Customer name', { exact: true }).fill('Browser customer');
  await form.getByRole('button', { name: 'Create customer', exact: true }).click();
  await page
    .getByLabel('Customer record', { exact: true })
    .selectOption({ label: 'BROWSER-CUSTOMER · Browser customer' });
  const credit = page.getByRole('form', { name: 'Save credit policy', exact: true });
  await credit.getByLabel('Credit eligible', { exact: true }).selectOption('true');
  await credit.getByLabel('Credit limit (USD minor units)', { exact: true }).fill('10000');
  await credit.getByLabel('Payment terms (days)', { exact: true }).fill('30');
  await credit.getByRole('button', { name: 'Save credit policy', exact: true }).click();
  await expect(credit.getByLabel('Credit limit (USD minor units)', { exact: true })).toHaveValue(
    '10000',
  );
  const outstanding = page
    .locator('.metric-card')
    .filter({ has: page.getByText('Outstanding', { exact: true }) });
  await expect(outstanding.getByText('USD 0.00', { exact: true })).toBeVisible();
  console.log('PASS real browser customer creation, credit policy and scoped statement');
}
