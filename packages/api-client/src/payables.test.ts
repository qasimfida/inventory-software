import { expect, it, vi } from 'vitest';
import { createPayableClient } from './payables.js';
import { payableForms } from './payable-forms.js';
import type { Business } from '@inventory/contracts';
const id = '00000000-0000-4000-8000-000000000001';
it('retries an uncertain supplier settlement with the identical key and validates the confirmed result', async () => {
  const request = vi.fn().mockResolvedValueOnce({ unknown: true }).mockResolvedValueOnce({ id });
  const key = vi.fn(() => id);
  const client = createPayableClient(request, key, id);
  const input = { kind: 'payment' as const, amountMinor: '1234', reference: 'Cash receipt 1' };
  await expect(client.settle(id, input)).rejects.toThrow();
  await expect(client.settle(id, input)).resolves.toEqual({ id });
  expect(key).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  expect(request.mock.calls[0]?.[0]).toBe(`/${id}/payables/${id}/settlements`);
});
it('offers a cash refund only for supplier debt and no financial writes for read-only roles', () => {
  const client = createPayableClient(vi.fn(), () => id, id);
  const business: Business = {
    id,
    name: 'Test',
    state: 'active',
    version: 1,
    role: 'owner',
    timeZone: 'UTC',
  };
  const data = {
    invoice: {
      id,
      purchaseId: id,
      supplierId: id,
      supplierName: 'Supplier',
      warehouseId: id,
      currency: 'USD' as const,
      reference: 'INV',
      dueDate: '2026-12-31',
      amountMinor: '1000',
      paidMinor: '1000',
      refundedMinor: '0',
      creditMinor: '400',
      outstandingMinor: '-400',
    },
    returns: [],
    events: [],
    offset: 0,
    hasMore: false,
  };
  expect(payableForms(client, business, data).map((f) => f.title)).toContain(
    'Record cash refund from supplier',
  );
  for (const role of ['viewer', 'cashier'] as const)
    expect(payableForms(client, { ...business, role }, data)).toEqual([]);
  expect(
    payableForms(
      client,
      { ...business, role: 'custom', permissions: ['purchases.read', 'payments.read'] },
      data,
    ),
  ).toEqual([]);
});
