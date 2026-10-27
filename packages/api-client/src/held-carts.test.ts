import { expect, it, vi } from 'vitest';
import { PosModel } from './pos-model.js';
import { createSalesClient } from './sales.js';
const id = '00000000-0000-4000-8000-000000000001';
const item = { id, name: 'Product', sku: 'SKU', unitId: id, units: [{ id, code: 'EA' }] };
const quote = {
  warehouseId: id,
  storeId: id,
  customerId: null,
  currency: 'USD',
  netMinor: '100',
  taxMinor: '0',
  totalMinor: '100',
  quoteFingerprint: 'a'.repeat(64),
  lines: [],
};
function setup() {
  const request = vi.fn(async (path: string) => {
    if (path.endsWith('/quotes')) return quote;
    throw new TypeError('Lost response');
  });
  return {
    request,
    model: new PosModel(
      createSalesClient(request, () => id, id),
      id,
    ),
  };
}
it('holds multiple named drafts without server effects, revalidates on resume, and clears on session reset', async () => {
  const { model, request } = setup();
  model.add(item);
  model.customer(id);
  model.edit(0, { quantity: '2', manualDiscountBasisPoints: 100 });
  await model.preview();
  model.heldCart({ type: 'hold', name: 'First' });
  expect(model.snapshot()).toMatchObject({ lines: [], customerId: null, quote: null });
  model.add(item);
  model.heldCart({ type: 'hold', name: 'Second' });
  expect(request).toHaveBeenCalledTimes(1);
  model.heldCart({ type: 'resume', name: 'First' });
  expect(model.snapshot()).toMatchObject({
    customerId: id,
    quote: null,
    lines: [{ quantity: '2', manualDiscountBasisPoints: 100 }],
  });
  expect(model.snapshot().heldCarts.map((c) => c.name)).toEqual(['Second']);
  await model.preview();
  expect(request).toHaveBeenCalledTimes(2);
  model.reset();
  expect(model.snapshot().heldCarts).toEqual([]);
});
it('does not overwrite active drafts, duplicate names or exceed the bounded session list', () => {
  const { model } = setup();
  for (let i = 0; i < 10; i++) {
    model.add(item);
    model.heldCart({ type: 'hold', name: `Cart ${i}` });
  }
  model.add(item);
  model.heldCart({ type: 'hold', name: 'Extra' });
  expect(model.snapshot().heldCarts).toHaveLength(10);
  model.heldCart({ type: 'resume', name: 'Cart 0' });
  expect(model.snapshot().lines).toHaveLength(1);
  expect(model.snapshot().heldCarts).toHaveLength(10);
  model.heldCart({ type: 'discard', name: 'Cart 9' });
  model.heldCart({ type: 'hold', name: 'cart 0' });
  expect(model.snapshot().heldCarts).toHaveLength(9);
  model.heldCart({ type: 'hold', name: ' ' });
  expect(model.snapshot().lines).toHaveLength(1);
});
it('blocks all draft switching during preview and an uncertain checkout', async () => {
  const { model } = setup();
  model.add(item);
  const pending = model.preview();
  model.heldCart({ type: 'hold', name: 'Busy' });
  expect(model.snapshot().heldCarts).toEqual([]);
  await pending;
  await model.checkout('100', '100');
  expect(model.snapshot().uncertain).toBe(true);
  const before = model.snapshot();
  for (const type of ['hold', 'resume', 'discard'] as const)
    model.heldCart({ type, name: 'Unknown' });
  expect(model.snapshot()).toBe(before);
});
