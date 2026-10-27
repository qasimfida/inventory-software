import { expect, it, vi } from 'vitest';
import type { SaleQuote } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { PosModel } from './pos-model.js';
import { createSalesClient } from './sales.js';
const id = '00000000-0000-4000-8000-000000000001';
const item = { id, name: 'Product', sku: 'SKU', unitId: id, units: [{ id, code: 'EA' }] };
const quote: SaleQuote = {
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
const receipt = {
  sale: {
    id,
    storeId: id,
    warehouseId: id,
    customerId: null,
    currency: 'USD',
    netMinor: '100',
    taxMinor: '0',
    totalMinor: '100',
    cashReceivedMinor: '100',
    changeMinor: '0',
    state: 'completed',
    actorId: id,
    createdAt: '2026-10-20T00:00:00.000Z',
  },
  lines: [],
  payments: [],
  receivableId: null,
  finance: {
    reconciled: true,
    outstandingMinor: '0',
    dueDate: null,
    returns: [],
    refunds: [],
    returnedLines: [],
  },
};
it('locks an uncertain cart and retries identical commands after lost and malformed responses', async () => {
  const bodies: unknown[] = [];
  let tries = 0;
  const transport = vi.fn(async (path: string, method?: string, body?: unknown) => {
    void method;
    if (path.endsWith('/quotes')) return quote;
    bodies.push(body);
    tries++;
    if (tries === 1) throw new TypeError('Lost response');
    if (tries === 2) return {};
    return receipt;
  });
  const model = new PosModel(
    createSalesClient(transport, () => id, id),
    id,
  );
  model.add(item);
  model.heldCart({ type: 'hold', name: 'Next customer' });
  model.add(item);
  await model.preview();
  await model.checkout('100', '100');
  expect(model.snapshot().uncertain).toBe(true);
  model.edit(0, { quantity: '99' });
  model.add(item);
  model.remove(0);
  expect(model.snapshot().lines[0]!.quantity).toBe('1');
  expect(model.snapshot().lines).toHaveLength(1);
  await model.checkout('999', '999');
  expect(model.snapshot().uncertain).toBe(true);
  await model.checkout('999', '999');
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[1]).toEqual(bodies[2]);
  expect(model.snapshot()).toMatchObject({ uncertain: false, lines: [], receipt });
  expect(model.snapshot().heldCarts.map((cart) => cart.name)).toEqual(['Next customer']);
});
it('rejects malformed amounts before submission and permits repricing after definitive stock rejection', async () => {
  const transport = vi.fn(async (path: string) => {
    if (path.endsWith('/quotes')) return quote;
    throw Object.assign(new Error('Stock unavailable'), { status: 409 });
  });
  const model = new PosModel(
    createSalesClient(transport, () => id, id),
    id,
  );
  model.add(item);
  await model.preview();
  await model.checkout('1.25', '100');
  expect(transport).toHaveBeenCalledTimes(1);
  await model.checkout('100', '100');
  expect(model.snapshot().uncertain).toBe(false);
  model.edit(0, { quantity: '2' });
  expect(model.snapshot().quote).toBeNull();
});
it('prevents simultaneous clicks and ignores a late receipt after session reset', async () => {
  let resolve!: (v: unknown) => void;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const transport = vi.fn(async (path: string) => (path.endsWith('/quotes') ? quote : pending)),
    model = new PosModel(
      createSalesClient(transport, () => id, id),
      id,
    );
  model.add(item);
  await model.preview();
  const first = model.checkout('100', '100');
  await model.checkout('100', '100');
  expect(transport).toHaveBeenCalledTimes(2);
  model.reset();
  resolve(receipt);
  await first;
  expect(model.snapshot().receipt).toBeNull();
});

it('does not publish a stale quote when an invalidation arrives during calculation', async () => {
  let resolve!: (q: SaleQuote) => void;
  const pending = new Promise<SaleQuote>((r) => {
    resolve = r;
  });
  const model = new PosModel(
    createSalesClient(
      async () => pending,
      () => id,
      id,
    ),
    id,
  );
  model.add(item);
  const calculating = model.preview();
  model.invalidate();
  resolve(quote);
  await calculating;
  expect(model.snapshot()).toMatchObject({ quote: null, busy: false });
  expect(model.snapshot().error).toContain('changed during calculation');
});

it('increments repeated product additions and requotes the combined quantity', async () => {
  const transport = vi.fn<OrganizationTransport>(async () => quote);
  const model = new PosModel(
    createSalesClient(transport, () => id, id),
    id,
  );
  model.add(item);
  await model.preview();
  model.add(item);
  model.add(item);
  expect(model.snapshot().lines).toHaveLength(1);
  expect(model.snapshot().lines[0]?.quantity).toBe('3');
  expect(model.snapshot().quote).toBeNull();
  await model.preview();
  expect(transport.mock.calls.at(-1)?.[2]).toMatchObject({
    lines: [{ variantId: id, quantity: '3' }],
  });
});
