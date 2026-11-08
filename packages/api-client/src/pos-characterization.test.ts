import type { OrganizationTransport } from './organization.js';
import { expect, it, vi } from 'vitest';
import { PosModel } from './pos-model.js';
import { createSalesClient } from './sales.js';
const id = '00000000-0000-4000-8000-000000000001';
const unit = '00000000-0000-4000-8000-000000000002';
const item = {
  id,
  name: 'Product',
  sku: 'SKU',
  unitId: id,
  units: [
    { id, code: 'EA' },
    { id: unit, code: 'BOX' },
  ],
};
const quote = {
  warehouseId: id,
  storeId: id,
  customerId: id,
  currency: 'USD',
  netMinor: '900',
  taxMinor: '90',
  totalMinor: '990',
  quoteFingerprint: 'a'.repeat(64),
  lines: [],
};
it('pins quote payload, unit/discount line identity, credit intent and stable uncertain retries', async () => {
  const request = vi.fn<OrganizationTransport>(async (path) => {
    if (path.endsWith('/quotes')) return quote;
    throw new TypeError('Response lost');
  });
  const key = vi.fn(() => unit);
  const model = new PosModel(createSalesClient(request, key, id), id);
  model.add(item);
  model.add(item);
  model.edit(0, { unitId: unit, quantity: '2.5', manualDiscountBasisPoints: 1000 });
  model.add(item);
  model.customer(id);
  expect(
    model.snapshot().lines.map((l) => [l.unitId, l.quantity, l.manualDiscountBasisPoints]),
  ).toEqual([
    [unit, '2.5', 1000],
    [id, '1', 0],
  ]);
  await model.preview();
  const cart = {
    warehouseId: id,
    customerId: id,
    lines: [
      {
        variantId: id,
        unitId: unit,
        quantity: '2.5',
        locationId: null,
        manualDiscountBasisPoints: 1000,
      },
      { variantId: id, unitId: id, quantity: '1', locationId: null, manualDiscountBasisPoints: 0 },
    ],
  };
  expect(request).toHaveBeenNthCalledWith(1, `/${id}/pos/quotes`, 'POST', cart);
  // Model carries credit intent; backend remains responsible for authorization and eligibility.
  await model.checkout('0', '0', 'Approved credit');
  const command = request.mock.calls[1]![2];
  expect(command).toEqual({
    ...cart,
    quoteFingerprint: quote.quoteFingerprint,
    cashAppliedMinor: '0',
    cashReceivedMinor: '0',
    creditOverrideReason: 'Approved credit',
    idempotencyKey: unit,
  });
  expect(model.snapshot().uncertain).toBe(true);
  model.customer(null);
  model.edit(0, { quantity: '99' });
  await model.checkout('990', '1000');
  expect(request.mock.calls[2]![2]).toEqual(command);
  expect(key).toHaveBeenCalledTimes(1);
});
it('pins hold/resume invalidation and blocks checkout until a fresh quote exists', async () => {
  const request = vi.fn(async () => quote);
  const model = new PosModel(
    createSalesClient(request, () => id, id),
    id,
  );
  model.add(item);
  await model.preview();
  model.heldCart({ type: 'hold', name: 'Counter one' });
  model.heldCart({ type: 'resume', name: 'Counter one' });
  expect(model.snapshot()).toMatchObject({
    quote: null,
    lines: [{ quantity: '1' }],
    heldCarts: [],
  });
  await model.checkout('990', '1000');
  expect(request).toHaveBeenCalledTimes(1);
  await model.preview();
  model.invalidate();
  await model.checkout('990', '1000');
  expect(request).toHaveBeenCalledTimes(2);
});
