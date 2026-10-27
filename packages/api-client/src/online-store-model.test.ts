import { describe, expect, it, vi } from 'vitest';
import { OnlineStoreModel } from './online-store-model.js';
import { initialOnlineSettings, setupChecklist } from './online-store-setup.js';
import { createOnlineStoreClient } from './storefront-management.js';
import { availableRoutes } from './workspace-navigation.js';
import { createDemoSeed } from './mock/seed.js';
const businessId = '00000000-0000-4000-8000-000000000001',
  storeId = '00000000-0000-4000-8000-000000000002';
function fixture() {
  let settings = { ...initialOnlineSettings(businessId, storeId, {}), version: 1 };
  const request = vi.fn(async (path: string, method?: string) =>
    method === 'POST'
      ? { ok: true, items: [] }
      : path.includes('check-slug')
        ? { available: true, suggestions: [] }
        : { settings, defaults: {}, prerequisites: [] },
  );
  const model = new OnlineStoreModel(
    createOnlineStoreClient(request, businessId, storeId),
    businessId,
    storeId,
    () => '00000000-0000-4000-8000-000000000003',
  );
  return {
    model,
    request,
    replace: () => {
      settings = { ...settings, version: 2, name: 'Server edit' };
    },
  };
}
describe('online store setup editor', () => {
  it('retains dirty fields and their original version through a live refresh; cancel accepts latest server state', async () => {
    const f = fixture();
    await f.model.refresh();
    f.model.edit({ ...f.model.snapshot().draft!, name: 'My edit' });
    f.replace();
    await f.model.refresh();
    expect(f.model.snapshot().draft?.name).toBe('My edit');
    expect(f.model.snapshot().draft?.version).toBe(1);
    f.model.cancel();
    expect(f.model.snapshot().draft?.name).toBe('Server edit');
    expect(f.model.snapshot().dirty).toBe(false);
  });
  it('keeps invalid forms editable and sends no invalid command', async () => {
    const f = fixture();
    await f.model.refresh();
    f.model.edit({ ...f.model.snapshot().draft!, slug: 'api' });
    expect(await f.model.save()).toBe(false);
    expect(f.model.snapshot().error).toContain('reserved');
    expect(f.model.snapshot().unavailable).toBe(false);
    expect(f.request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(0);
  });
  it('retains last-loaded data read-only on network failure and clears on denial', async () => {
    const f = fixture();
    await f.model.refresh();
    f.request.mockRejectedValueOnce(new Error('offline'));
    await f.model.refresh();
    expect(f.model.snapshot().draft).not.toBeNull();
    expect(f.model.snapshot().unavailable).toBe(true);
    f.request.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));
    await f.model.refresh();
    expect(f.model.snapshot().draft).toBeNull();
  });
  it('uses the same command identity for an uncertain retry and never auto-retries', async () => {
    const f = fixture();
    await f.model.refresh();
    f.request.mockRejectedValueOnce(new Error('offline'));
    await f.model.save();
    expect(f.request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1);
    await f.model.save();
    const writes = f.request.mock.calls.filter((c) => c[1] === 'POST');
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual(writes[1]);
  });
  it('does not infer publication from configuration, and lists missing setup requirements', () => {
    const draft = initialOnlineSettings(businessId, storeId, {
      name: 'Inherited name',
      contact: { email: 'a@example.com', phone: '', address: 'Public address' },
    });
    expect(draft.enabled).toBe(false);
    expect(draft.name).toBe('Inherited name');
    expect(
      setupChecklist(draft, ['Complete the business name and address.'])
        .filter((c) => !c.done)
        .map((c) => c.label),
    ).toEqual([
      'Business profile',
      'Return and shipping policies',
      'Approved image sources',
      'Stock-source warehouses',
    ]);
  });
  it('keeps one Online store navigation entry before and after enablement', () => {
    const owner = createDemoSeed(0, 'owner').business;
    expect(
      availableRoutes(owner)
        .filter((r) => r.group === 'Online store')
        .map((r) => r.path),
    ).toEqual(['/online-store']);
    expect(
      availableRoutes(owner, true)
        .filter((r) => r.group === 'Online store')
        .map((r) => r.path),
    ).toEqual(['/online-store']);
    expect(
      availableRoutes(createDemoSeed(0, 'cashier').business, true).filter(
        (r) => r.group === 'Online store',
      ),
    ).toEqual([]);
  });
});
