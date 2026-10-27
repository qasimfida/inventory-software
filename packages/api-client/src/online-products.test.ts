import { expect, it, vi } from 'vitest';
import { OnlineProductsModel, selectionToggle, overridePreview } from './online-products.js';
import { selectOnlineResults } from './online-picker.js';
import { createOnlineStoreClient } from './storefront-management.js';
import { mockStorefrontManagement } from './mock/storefront-management.js';
import { createDemoSeed } from './mock/seed.js';
import { demoState } from './mock/state.js';
function fixture() {
  demoState.scenario = 'normal';
  const seed = createDemoSeed(1, 'owner'),
    store = seed.locations.find((l) => l.kind === 'stores')!;
  const request = vi.fn(async (path: string, method = 'GET', body?: unknown) => {
    const url = new URL('https://example.test' + path);
    return mockStorefrontManagement(
      seed,
      'stores/' + url.pathname.split('/stores/')[1],
      method,
      body,
      url.searchParams,
    );
  });
  const client = createOnlineStoreClient(request, seed.business.id, store.id);
  return { client, request, model: new OnlineProductsModel(client, () => crypto.randomUUID()) };
}
it('loads active and paused together, excludes sensitive fields and caps selection', async () => {
  const f = fixture();
  await f.model.load({ tab: 'active' });
  expect(f.model.snapshot().error).toBe('');
  expect(f.model.snapshot().page!.items.every((i) => ['active', 'paused'].includes(i.status))).toBe(
    true,
  );
  expect(JSON.stringify(f.model.snapshot().previews)).not.toContain('costMinor');
  const selected = new Map(
    Array.from({ length: 200 }, (value, i) => {
      void value;
      return [String(i), i];
    }),
  );
  expect(() => selectionToggle(selected, 'new', 201)).toThrow('200');
  expect(selectionToggle(selected, '0', 0).size).toBe(199);
});
it('retains data on connection loss, clears on denial, and never automatically retries writes', async () => {
  const f = fixture();
  await f.model.load({ tab: 'ready' });
  const item = f.model.snapshot().page!.items[0]!;
  f.request.mockRejectedValueOnce(new Error('Offline'));
  await f.model.load({ tab: 'ready' });
  expect(f.model.snapshot().page).not.toBeNull();
  f.request.mockRejectedValueOnce(Object.assign(new Error('Denied'), { status: 403 }));
  await f.model.load({ tab: 'ready' });
  expect(f.model.snapshot().page).toBeNull();
  f.request.mockRejectedValueOnce(new Error('Uncertain response'));
  await f.model.command({
    action: 'pause',
    items: [{ id: item.id, version: item.version }],
    all: false,
  });
  const first = f.request.mock.calls.at(-1)![2];
  await f.model.command({
    action: 'pause',
    items: [{ id: item.id, version: item.version }],
    all: false,
  });
  expect(f.request.mock.calls.at(-1)![2]).toEqual(first);
});
it('uses inherited values and the same readiness evaluator for overrides', async () => {
  const f = fixture(),
    page = await f.client.listings({ tab: 'ready' }),
    d = await f.client.detail(page.items[0]!.id);
  const next = overridePreview(d.preview, {
    title: '',
    description: null,
    images: [],
    price: { unitPrice: '0', currency: 'USD' },
    visible: true,
  });
  expect(next.issues.map((i) => i.code)).toContain('TITLE_MISSING');
  expect(next.issues.map((i) => i.code)).toContain('PRICE_NOT_POSITIVE');
  expect(next.issues.map((i) => i.code)).toContain('NO_IMAGE');
  expect(d.preview.inherited.title).not.toBe('');
});
it('refuses unbounded select-all before reading further pages', async () => {
  const f = fixture();
  const products = vi.spyOn(f.client, 'products');
  products.mockResolvedValueOnce({ items: [], total: 201, hasMore: true, categories: [] });
  await expect(selectOnlineResults(f.client, {})).rejects.toThrow('200');
  expect(products).toHaveBeenCalledTimes(1);
});
it('ignores an obsolete page response after a newer filter load', async () => {
  const f = fixture(),
    old = await f.client.productPage({ tab: 'active' }),
    fresh = await f.client.productPage({ tab: 'ready' });
  let release!: (v: typeof old) => void;
  const spy = vi
    .spyOn(f.client, 'productPage')
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          release = r;
        }),
    )
    .mockResolvedValueOnce(fresh);
  const first = f.model.load({ tab: 'active' });
  await f.model.load({ tab: 'ready' });
  release(old);
  await first;
  expect(f.model.snapshot().page).toEqual(fresh.page);
  expect(spy).toHaveBeenCalledTimes(2);
});
it('does not let a live page refresh discard an in-flight command result', async () => {
  const f = fixture();
  await f.model.load({ tab: 'ready' });
  const listing = f.model.snapshot().page!.items[0]!;
  let complete!: (value: Awaited<ReturnType<typeof f.client.command>>) => void;
  const pending = new Promise<Awaited<ReturnType<typeof f.client.command>>>((resolve) => {
    complete = resolve;
  });
  vi.spyOn(f.client, 'command').mockReturnValueOnce(pending);
  const command = f.model.command({
    action: 'publish',
    all: false,
    items: [{ id: listing.id, version: listing.version }],
  });
  await f.model.load({ tab: 'active' });
  complete({ ok: true, items: [{ id: listing.id, ok: true, code: 'active' }] });
  expect(await command).not.toBeNull();
  expect(f.model.snapshot().result?.items[0]?.ok).toBe(true);
  expect(f.model.snapshot().busy).toBe(false);
});
