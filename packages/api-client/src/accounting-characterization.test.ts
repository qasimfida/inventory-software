import { afterEach, expect, it, vi } from 'vitest';
import { accountingPageSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { createAccountingClient } from './stage6.js';
import { accountingForms, canReadAccounting } from './accounting-forms.js';
const seed = createDemoSeed(0, 'owner');
const page = accountingPageSchema.parse(seed.accounting);
const client = createAccountingClient(vi.fn(), () => seed.id(999), seed.business.id);
afterEach(() => vi.useRealTimers());
it('requires business-wide read access and both write permissions', () => {
  expect(
    canReadAccounting({ ...seed.business, scope: { storeId: seed.id(2), warehouseId: null } }),
  ).toBe(false);
  expect(canReadAccounting({ ...seed.business, role: 'cashier' })).toBe(false);
  for (const permissions of [['reports.write'], ['payments.write']] as const)
    expect(
      accountingForms(client, page, {
        ...seed.business,
        role: 'custom',
        permissions: [...permissions],
      }),
    ).toEqual([]);
});
it('offers no source posting when the current page has no pending sources', () => {
  expect(
    accountingForms(client, { ...page, pending: [] }, seed.business).map((f) => f.title),
  ).not.toContain('Confirm source posting');
});
it('excludes reversal entries and originals already reversed on this page', () => {
  const original = page.journals[0]!;
  const reversal = {
    ...original,
    id: seed.id(991),
    sourceKind: 'reversal',
    reversalId: original.id,
  };
  expect(
    accountingForms(client, { ...page, journals: [original, reversal] }, seed.business).map(
      (f) => f.title,
    ),
  ).not.toContain('Confirm journal reversal');
});
it('only offers elapsed open UTC periods for permanent close', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  const periods = [
    { id: seed.id(991), from: '2026-10-01', to: '2026-10-31', state: 'open' as const },
    { id: seed.id(992), from: '2026-11-01', to: '2026-11-06', state: 'open' as const },
    { id: seed.id(993), from: '2026-09-01', to: '2026-09-30', state: 'closed' as const },
  ];
  const form = accountingForms(client, { ...page, periods }, seed.business).find(
    (f) => f.title === 'Confirm permanent period close',
  );
  expect(form?.fields[0]?.options?.map((o) => o.value)).toEqual([seed.id(991)]);
});
it('keeps manual journals balanced with exact minor-unit values', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const c = createAccountingClient(request, () => seed.id(999), seed.business.id);
  const form = accountingForms(c, page, seed.business).find(
    (f) => f.title === 'Confirm balanced manual journal',
  )!;
  await expect(
    form.submit({
      date: '2026-11-06',
      currency: 'USD',
      debit: '1000',
      credit: '3000',
      amount: '9007199254740993',
      reason: 'Opening balance correction',
    }),
  ).rejects.toThrow('uncertain');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[2]).toMatchObject({
    lines: [
      { account: '1000', debit: '9007199254740993', credit: '0' },
      { account: '3000', debit: '0', credit: '9007199254740993' },
    ],
  });
});
it('retains reversal identity and payload across an uncertain response', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const key = vi.fn(() => seed.id(999));
  const c = createAccountingClient(request, key, seed.business.id);
  const input = { date: '2026-11-06', reason: 'Correct the original journal' };
  await expect(c.reverse(page.journals[0]!.id, input)).rejects.toThrow('uncertain');
  expect(request).toHaveBeenCalledTimes(1);
  await expect(c.reverse(page.journals[0]!.id, input)).rejects.toThrow('uncertain');
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(key).toHaveBeenCalledTimes(1);
});
