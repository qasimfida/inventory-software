import { throwIfCancelled } from './cancellation.js';
import { expect, it, vi } from 'vitest';
import { stepQuantity } from './quantity-step.js';
import { paginationPages } from './stock-presentation.js';
import { observeCartQuotes } from './auto-quote.js';
import { createSalesClient } from './sales.js';
import { PosModel } from './pos-model.js';
import { withReadRetries } from './read-retry.js';
import { cancellableResource } from './cancellable-resource.js';
const id = '00000000-0000-4000-8000-000000000001';
it('steps fractional and large quantities exactly without inventing valid replacements', () => {
  expect(stepQuantity('9007199254740993.000001', 1)).toBe('9007199254740994.000001');
  expect(stepQuantity('1.5', -1)).toBe('0.5');
  expect(stepQuantity('0.5', -1)).toBeNull();
  expect(stepQuantity('invalid', 1)).toBeNull();
});
it('keeps first, adjacent and final pages with bounded ellipses', () => {
  expect(paginationPages(5, 16)).toEqual([1, 'gap', 4, 5, 6, 'gap', 16]);
  expect(paginationPages(1, 1)).toEqual([1]);
});
it('coalesces cart edits into a quote, reprices changes, and never automatically posts a sale', async () => {
  const transport = vi.fn(async (path: string) => ({
    warehouseId: path.endsWith('/quotes') ? id : '',
    storeId: id,
    customerId: null,
    currency: 'USD',
    netMinor: '100',
    taxMinor: '0',
    totalMinor: '100',
    quoteFingerprint: 'a'.repeat(64),
    lines: [],
  }));
  const model = new PosModel(
    createSalesClient(transport, () => id, id),
    id,
  );
  let pending: (() => void) | undefined;
  const stop = observeCartQuotes(model, (work) => {
    pending = work;
    return () => {
      pending = undefined;
    };
  });
  model.add({ id, name: 'Item', sku: 'ITEM', unitId: id, units: [{ id, code: 'EA' }] });
  model.edit(0, { quantity: '2' });
  model.edit(0, { quantity: '3' });
  pending?.();
  await vi.waitFor(() => expect(model.snapshot().quote).not.toBeNull());
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls.every((call) => String(call[0]).endsWith('/quotes'))).toBe(true);
  model.edit(0, { quantity: '4' });
  expect(model.snapshot().quote).toBeNull();
  stop();
  expect(pending).toBeUndefined();
});
it('does not retry an explicitly cancelled search', async () => {
  const controller = new AbortController();
  const transport = vi.fn(async () => {
    controller.abort();
    throw new Error('Cancelled');
  });
  const pause = vi.fn(async () => {});
  await expect(
    withReadRetries(transport, pause)('http://localhost', {
      method: 'GET',
      headers: {},
      credentials: 'omit',
      signal: controller.signal,
    }),
  ).rejects.toThrow('Cancelled');
  expect(transport).toHaveBeenCalledTimes(1);
  expect(pause).not.toHaveBeenCalled();
});
it('creates fresh cancellation on remount and ignores a superseded result', async () => {
  let resolve!: (v: string) => void;
  let attempts = 0;
  const resource = cancellableResource(
    async (signal) => {
      throwIfCancelled(signal);
      attempts++;
      return attempts === 1
        ? new Promise<string>((done) => {
            resolve = done;
          })
        : 'new';
    },
    () => new AbortController(),
  );
  const first = resource.model.run();
  resource.cancel();
  await resource.model.run();
  resolve('old');
  await first;
  expect(resource.model.snapshot().data).toBe('new');
});
