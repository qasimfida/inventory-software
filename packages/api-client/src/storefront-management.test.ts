import { it, expect, vi } from 'vitest';
import { createOnlineStoreClient } from './storefront-management.js';
import { demoTransport, demoController } from './mock/index.js';
import { demoId } from './mock/identity.js';
import { ResourceModel } from './resource-model.js';
const id = demoId(1),
  store = demoId(2),
  key = demoId(999);
function client() {
  return createOnlineStoreClient(
    async (path, method = 'GET', body) => {
      const response = await demoTransport(`http://localhost/api/v1/businesses${path}`, {
        method,
        headers: {},
        credentials: 'omit',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));
      return result;
    },
    id,
    store,
  );
}
it('keeps commands single-attempt with the caller stable identity', async () => {
  const request = vi.fn().mockRejectedValue(new Error('offline'));
  await expect(
    createOnlineStoreClient(request, id, store).command({
      action: 'disable',
      version: 1,
      idempotencyKey: key,
    }),
  ).rejects.toThrow('offline');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[2]).toEqual({
    action: 'disable',
    version: 1,
    idempotencyKey: key,
  });
});
it('simulates all management query contracts and versioned writes without real requests', async () => {
  demoController.configure('owner', 'normal');
  const c = client();
  expect((await c.settings()).settings?.name).toBeTruthy();
  expect((await c.listings()).items).toHaveLength(25);
  expect((await c.overview()).counts.active).toBeGreaterThan(0);
  expect((await c.checkSlug('taken')).available).toBe(false);
  expect((await c.hostImpact('images.example.com')).count).toBe(36);
  const input = { action: 'enable' as const, version: 1, idempotencyKey: key };
  expect(await c.command(input)).toEqual(await c.command(input));
  expect((await c.settings()).settings?.enabled).toBe(true);
  const item = (await c.listings({ status: 'ready' })).items[0]!;
  await c.command({
    action: 'publish',
    items: [{ id: item.id, version: item.version }],
    all: false,
    idempotencyKey: demoId(998),
  });
  expect(await c.history(item.id)).toHaveLength(1);
});
it('provides manager read-only and denies cashier management access', async () => {
  demoController.configure('manager', 'normal');
  await client().overview();
  await expect(
    client().command({ action: 'disable', version: 1, idempotencyKey: key }),
  ).rejects.toThrow('permission');
  demoController.configure('cashier', 'normal');
  await expect(client().settings()).rejects.toThrow('permission');
});
it.each(['error', 'offline', 'denied', 'stale', 'rate-limited'] as const)(
  'models %s failures',
  async (scenario) => {
    demoController.configure('owner', scenario);
    await expect(
      client().command({ action: 'disable', version: 1, idempotencyKey: key }),
    ).rejects.toThrow();
  },
);
it('retains last-loaded data on transient refresh failure and clears it on reset', async () => {
  const load = vi
    .fn()
    .mockResolvedValueOnce({ version: 1 })
    .mockRejectedValue(new Error('offline'));
  const model = new ResourceModel(load);
  await model.run();
  await model.refresh();
  expect(model.snapshot().data).toEqual({ version: 1 });
  expect(model.snapshot().error).toBeTruthy();
  model.reset();
  expect(model.snapshot().data).toBeNull();
});
it('discards retained storefront data when current server authorization is denied', async () => {
  const { storefrontResource } = await import('./storefront-resource.js');
  const load = vi.fn().mockRejectedValue(Object.assign(new Error('Denied'), { status: 403 }));
  const model = storefrontResource(load);
  await model.refresh();
  expect(model.snapshot().data).toBeNull();
});
it('preserves the safe stale-listing recovery message from the API', async () => {
  const { AuthenticationError } = await import('./auth.js');
  const error = new AuthenticationError(409, {
    code: 'LISTING_CHANGED',
    message: 'This listing changed. Review the latest version.',
    requestId: 'test-reference',
    retryable: false,
  });
  expect(error.message).toBe('This listing changed. Review the latest version.');
});
it('simulates partial publication without reporting failed items as published', async () => {
  demoController.configure('owner', 'partial');
  const c = client();
  await c.command({ action: 'enable', version: 1, idempotencyKey: key });
  const ready = (await c.listings({ status: 'ready' })).items.slice(0, 2);
  const result = await c.command({
    action: 'publish',
    items: ready.map((i) => ({ id: i.id, version: i.version })),
    all: false,
    idempotencyKey: demoId(997),
  });
  expect(result.ok).toBe(false);
  expect(result.items.map((i) => i.ok)).toEqual([true, false]);
});
it('simulates slow responses without changing the response contract', async () => {
  demoController.configure('owner', 'slow');
  expect((await client().overview()).status).toBe('configured');
});
