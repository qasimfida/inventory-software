import { expect, it, vi } from 'vitest';
import { payableDetailSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { createPayableClient } from './payables.js';
import { payableForms } from './payable-forms.js';
const seed = createDemoSeed(0, 'owner');
const detail = payableDetailSchema.parse(seed.payables[0]);
const client = createPayableClient(vi.fn(), () => seed.id(999), seed.business.id);
it.each([
  ['9007199254740993', 'Record supplier cash payment'],
  ['-9007199254740993', 'Record cash refund from supplier'],
  ['0', null],
])('preserves the direction of exact outstanding %s', (outstandingMinor, title) => {
  const forms = payableForms(client, seed.business, {
    ...detail,
    invoice: { ...detail.invoice, outstandingMinor },
  });
  const settlements = forms.filter((f) => /cash/.test(f.title));
  expect(settlements.map((f) => f.title)).toEqual(title ? [title] : []);
});
it('requires both cash and payment authority for settlement and purchase authority for credit', () => {
  const business = {
    ...seed.business,
    role: 'custom' as const,
    permissions: ['payments.write' as const],
  };
  expect(payableForms(client, business, detail)).toEqual([]);
  expect(
    payableForms(
      client,
      { ...business, permissions: ['payments.write', 'payments.cash'] },
      detail,
    ).map((f) => f.title),
  ).toEqual(['Record supplier cash payment']);
});
it('never offers further credit after the original invoice is fully credited', () => {
  const forms = payableForms(client, seed.business, {
    ...detail,
    invoice: { ...detail.invoice, creditMinor: detail.invoice.amountMinor },
  });
  expect(forms.map((f) => f.title)).not.toContain('Record confirmed supplier return credit');
});
it('preserves credit payload and retry key after an uncertain response without an automatic retry', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const key = vi.fn(() => seed.id(999));
  const c = createPayableClient(request, key, seed.business.id);
  const input = {
    returnId: seed.id(998),
    amountMinor: '9007199254740993',
    reference: 'Credit note',
    reason: 'Confirmed by supplier',
  };
  await expect(c.credit(detail.invoice.id, input)).rejects.toThrow('uncertain');
  expect(request).toHaveBeenCalledTimes(1);
  await expect(c.credit(detail.invoice.id, input)).rejects.toThrow('uncertain');
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(request.mock.calls[0]?.[2]).toMatchObject(input);
  expect(key).toHaveBeenCalledTimes(1);
});
