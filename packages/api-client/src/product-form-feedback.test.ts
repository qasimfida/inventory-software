import { afterEach, expect, it, vi } from 'vitest';
import { createCatalogClient } from './catalog.js';
import {
  duplicateSkuMessage,
  saveProductDetails,
  watchProductSku,
} from './product-form-feedback.js';
const runtime = () => ({
  controller: new AbortController(),
  schedule(work: () => void) {
    const timer = setTimeout(work, 350);
    return () => clearTimeout(timer);
  },
});
afterEach(() => vi.useRealTimers());
it('debounces checks, normalizes SKU and cancels stale responses', async () => {
  vi.useFakeTimers();
  let reply!: (value: unknown) => void;
  const request = vi.fn(
    (path: string) =>
      new Promise((resolve) => {
        if (path.includes('sku-availability')) reply = resolve;
      }),
  );
  const notify = vi.fn();
  const host = runtime();
  const cancel = watchProductSku(
    createCatalogClient(request, 'business'),
    'old-sku',
    undefined,
    notify,
    host,
  );
  await vi.advanceTimersByTimeAsync(349);
  expect(request).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(request.mock.calls[0]?.[0]).toContain('sku=OLD-SKU');
  cancel();
  expect(host.controller.signal.aborted).toBe(true);
  reply({ available: false });
  await vi.runAllTimersAsync();
  expect(notify).toHaveBeenCalledTimes(1);
});
it('shows unknown when the advisory request fails without blocking authoritative saves', async () => {
  vi.useFakeTimers();
  const notify = vi.fn();
  watchProductSku(
    createCatalogClient(vi.fn().mockRejectedValue(new Error('offline')), 'business'),
    'SKU',
    undefined,
    notify,
    runtime(),
  );
  await vi.advanceTimersByTimeAsync(350);
  expect(notify).toHaveBeenLastCalledWith({ value: 'SKU', state: 'unknown' });
});
it('maps invalid codes, images and service tracking to their fields without a write', async () => {
  const request = vi.fn(),
    fields = vi.fn();
  await expect(
    saveProductDetails(
      createCatalogClient(request, 'business'),
      null,
      {
        name: '',
        sku: 'SKU',
        barcodes: ['SKU'],
        images: ['http://invalid.test/image'],
        type: 'service',
        trackInventory: true,
      },
      fields,
    ),
  ).rejects.toThrow();
  expect(fields.mock.lastCall?.[0]).toMatchObject({
    name: expect.any(String),
    images: expect.any(String),
    barcodes: expect.any(String),
    trackInventory: expect.any(String),
  });
  expect(request).not.toHaveBeenCalled();
});
it('rechecks SKU after a save conflict and does not retry the mutation', async () => {
  const request = vi
      .fn()
      .mockRejectedValueOnce({ status: 409 })
      .mockResolvedValueOnce({ available: false }),
    fields = vi.fn();
  await expect(
    saveProductDetails(
      createCatalogClient(request, 'business'),
      null,
      { name: 'Mug', sku: 'MUG' },
      fields,
    ),
  ).rejects.toThrow(duplicateSkuMessage);
  expect(fields).toHaveBeenLastCalledWith({ sku: duplicateSkuMessage });
  expect(request.mock.calls.map((call) => call[1])).toEqual(['POST', 'GET']);
});
it('does not mislabel version conflicts as duplicate SKUs', async () => {
  const conflict = { status: 409 };
  const request = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({ available: true }),
    fields = vi.fn();
  await expect(
    saveProductDetails(
      createCatalogClient(request, 'business'),
      null,
      { name: 'Mug', sku: 'MUG' },
      fields,
    ),
  ).rejects.toBe(conflict);
  expect(fields).toHaveBeenLastCalledWith({});
});

it('maps safe server validation paths back to controls', async () => {
  const request = vi.fn().mockRejectedValue({
    status: 400,
    details: {
      code: 'BAD_REQUEST',
      message: 'Request validation failed.',
      requestId: '00000000-0000-4000-8000-000000000001',
      retryable: false,
      fields: [{ path: 'images.0', code: 'invalid_format' }],
    },
  });
  const fields = vi.fn();
  await expect(
    saveProductDetails(
      createCatalogClient(request, 'business'),
      null,
      { name: 'Mug', sku: 'MUG' },
      fields,
    ),
  ).rejects.toBeTruthy();
  expect(fields).toHaveBeenLastCalledWith({ images: expect.stringContaining('HTTPS') });
});
