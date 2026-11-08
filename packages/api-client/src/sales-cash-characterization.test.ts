import { expect, it, vi } from 'vitest';
import { saleReceiptSchema } from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { cashForms } from './cash-forms.js';
import { returnForms } from './return-forms.js';
import { createCashClient } from './cash.js';
import { createSalesClient } from './sales.js';
const seed = createDemoSeed(0, 'owner');
const receipt = saleReceiptSchema.parse(seed.sales[0]);
it.each(['returned', 'voided'] as const)('offers no corrections after %s', (state) => {
  const client = createSalesClient(vi.fn(), () => 'key', seed.business.id);
  expect(
    returnForms(client, seed.business, { ...receipt, sale: { ...receipt.sale, state } }),
  ).toEqual([]);
});
it('hides all cash and correction commands from a viewer', () => {
  const business = { ...seed.business, role: 'viewer' as const };
  expect(
    cashForms(
      createCashClient(vi.fn(), () => 'key', business.id),
      business,
      seed.id(3),
      seed.locations,
      seed.shifts,
    ),
  ).toEqual([]);
  expect(
    returnForms(
      createSalesClient(vi.fn(), () => 'key', business.id),
      business,
      receipt,
    ),
  ).toEqual([]);
});
it('never exposes close or adjustment commands for a closed shift', () => {
  const shifts = seed.shifts.map((s) => ({ ...s, state: 'closed' as const }));
  const forms = cashForms(
    createCashClient(vi.fn(), () => 'key', seed.business.id),
    seed.business,
    seed.id(3),
    seed.locations,
    shifts,
  );
  expect(forms.map((f) => f.title)).toEqual(['Open cash shift']);
});
it('keeps cash close single-attempt with stable identity on an uncertain response', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const key = vi.fn(() => 'close-key');
  const client = createCashClient(request, key, seed.business.id);
  await expect(client.close(seed.shifts[0]!.id, { countedMinor: '12345' })).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  await expect(client.close(seed.shifts[0]!.id, { countedMinor: '12345' })).rejects.toThrow();
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(key).toHaveBeenCalledTimes(1);
});
it('uses exact remaining quantity for a full return, preserving disposition', async () => {
  const request = vi.fn().mockRejectedValue(new Error('uncertain'));
  const client = createSalesClient(request, () => 'return-key', seed.business.id);
  const line = { ...receipt.lines[0]!, quantity: '2.000001' };
  const data = {
    ...receipt,
    lines: [line],
    finance: { ...receipt.finance, returnedLines: [{ saleLineId: line.id, quantity: '0.250001' }] },
  };
  const form = returnForms(client, seed.business, data).find(
    (f) => f.title === 'Return all remaining lines',
  )!;
  await expect(
    form.submit({ disposition: 'damaged', note: 'Confirmed damaged item' }),
  ).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[2]).toMatchObject({
    kind: 'return',
    lines: [{ saleLineId: line.id, quantity: '1.75', disposition: 'damaged' }],
  });
});
