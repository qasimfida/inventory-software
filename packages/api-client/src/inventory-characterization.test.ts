import { expect, it, vi } from 'vitest';
import { createInventoryClient } from './inventory.js';
import { createCatalogClient } from './catalog.js';
import { ResourceModel } from './resource-model.js';
import type { OrganizationTransport } from './organization.js';

const id = '00000000-0000-4000-8000-000000000001';
it('retains the stock command identity, exact quantity and scope after an uncertain response', async () => {
  const request = vi.fn<OrganizationTransport>().mockRejectedValue(new Error('lost response'));
  const key = vi.fn(() => id);
  const client = createInventoryClient(request, key, 'business');
  const input = {
    warehouseId: id,
    locationId: null,
    variantId: id,
    unitId: id,
    quantity: '1.000001',
    type: 'adjustment_out' as const,
    reason: 'Damaged packaging',
  };
  await expect(client.post(input)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  await expect(client.post(input)).rejects.toThrow();
  expect(key).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  expect(request.mock.calls[0]).toEqual([
    '/business/stock/movements',
    'POST',
    { ...input, idempotencyKey: id },
  ]);
});

it('sends category transitions with their version and never retries a failed catalog write', async () => {
  const request = vi.fn<OrganizationTransport>().mockRejectedValue(new Error('conflict'));
  const client = createCatalogClient(request, 'business');
  const input = { name: 'Accessories', parentId: null, state: 'archived' as const, version: 7 };
  await expect(client.editCategory(id, input)).rejects.toThrow('conflict');
  expect(request).toHaveBeenCalledExactlyOnceWith(`/business/categories/${id}`, 'PATCH', input);
});

it('distinguishes a confirmed mutation followed by failed reload from a failed mutation', async () => {
  const work = vi.fn(async () => undefined);
  const model = new ResourceModel(async () => {
    throw new Error('offline');
  });
  await model.run(work);
  expect(work).toHaveBeenCalledTimes(1);
  expect(model.snapshot().error).toContain('The action completed');
  await model.run();
  expect(work).toHaveBeenCalledTimes(1);
  expect(model.snapshot().error).toBe('Unable to load data. Reconnect and retry.');
});

it('keeps loaded records during a live refresh and ignores completion after reset', async () => {
  let resolve!: (value: string[]) => void;
  const load = vi
    .fn()
    .mockResolvedValueOnce(['SKU-1'])
    .mockImplementationOnce(
      () =>
        new Promise<string[]>((done) => {
          resolve = done;
        }),
    );
  const model = new ResourceModel<string[]>(load);
  await model.run();
  const refresh = model.refresh();
  await Promise.resolve();
  expect(model.snapshot()).toEqual({ data: ['SKU-1'], busy: true, error: '' });
  model.reset();
  resolve(['SKU-2']);
  await refresh;
  expect(model.snapshot()).toEqual({ data: null, busy: false, error: '' });
});
