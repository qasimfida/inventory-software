import { expect } from '@playwright/test';
export async function expectFacts(record, values) {
  for (const [label, value] of Object.entries(values)) {
    const row = record.getByText(label, { exact: true }).locator('..');
    await expect(row.locator('dd')).toHaveText(value);
  }
}
export async function expectShift(page, values) {
  const shift = page
    .getByLabel('Cash shift', { exact: true })
    .filter({ has: page.getByText(values.Expected, { exact: true }) });
  await expectFacts(shift, values);
}
