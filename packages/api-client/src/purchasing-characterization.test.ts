import { expect, it, vi } from 'vitest';
import { purchaseDetailSchema } from '@inventory/contracts';
import { purchaseDetailForms } from './purchase-forms.js';
import { createPurchasingClient } from './purchasing.js';
import type { OrganizationTransport } from './organization.js';
const id = '00000000-0000-4000-8000-000000000001';
const detail = purchaseDetailSchema.parse({
  order: {
    id,
    supplierId: id,
    warehouseId: id,
    reference: 'PO-1',
    currency: 'USD',
    state: 'draft',
    version: 7,
    createdAt: '2026-11-06T00:00:00Z',
  },
  lines: [],
  receipts: [],
  returns: [],
  invoices: [],
});
it.each([
  ['draft', ['approve purchase PO-1', 'cancel purchase PO-1']],
  ['approved', ['order purchase PO-1', 'cancel purchase PO-1']],
  [
    'ordered',
    ['cancel purchase PO-1', 'Receive purchase delivery', 'Record supplier invoice reference'],
  ],
  [
    'partially_received',
    ['cancel purchase PO-1', 'Receive purchase delivery', 'Record supplier invoice reference'],
  ],
  ['completed', ['Record supplier invoice reference']],
  ['cancelled', []],
] as const)('preserves %s actions without inventing transitions', (state, titles) => {
  const client = createPurchasingClient(vi.fn(), () => id, 'business');
  expect(
    purchaseDetailForms(client, { ...detail, order: { ...detail.order, state } }).map(
      (f) => f.title,
    ),
  ).toEqual(titles);
});
it('retains partial delivery quantity, location and retry identity after uncertain failure', async () => {
  const request = vi
    .fn<OrganizationTransport>()
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValue(detail);
  const key = vi.fn(() => id);
  const client = createPurchasingClient(request, key, 'business');
  const form = purchaseDetailForms(client, {
    ...detail,
    order: { ...detail.order, state: 'partially_received' },
  }).find((f) => f.title === 'Receive purchase delivery')!;
  const values = { lineId: id, quantity: '0.250001', locationId: '' };
  await expect(form.submit(values)).rejects.toThrow('lost response');
  expect(request).toHaveBeenCalledTimes(1);
  await form.submit(values);
  expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  expect(request).toHaveBeenLastCalledWith(`/business/purchases/${id}/receipts`, 'POST', {
    lineId: id,
    quantity: '0.250001',
    locationId: null,
    idempotencyKey: id,
  });
  expect(key).toHaveBeenCalledTimes(1);
});
it('keeps transition version/reason and keeps supplier writes single-attempt', async () => {
  const request = vi.fn<OrganizationTransport>().mockResolvedValue(detail);
  const client = createPurchasingClient(request, () => id, 'business');
  await purchaseDetailForms(client, detail)[0]!.submit({ reason: 'Reviewed order' });
  expect(request).toHaveBeenCalledWith(`/business/purchases/${id}/transitions`, 'POST', {
    action: 'approve',
    version: 7,
    reason: 'Reviewed order',
    idempotencyKey: id,
  });
  request.mockClear().mockRejectedValue(new Error('conflict'));
  await expect(
    client.supplier(
      { name: 'Supply', code: 'SUP', email: '', phone: '', notes: '', state: 'active' },
      id,
      3,
    ),
  ).rejects.toThrow('conflict');
  expect(request).toHaveBeenCalledTimes(1);
});
