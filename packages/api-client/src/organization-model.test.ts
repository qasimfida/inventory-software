import { expect, it, vi } from 'vitest';
import { OrganizationModel } from './organization-model.js';
import { createOrganizationClient } from './organization.js';
import type { Business, Workspace } from '@inventory/contracts';
const a: Business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'A',
  role: 'owner',
  state: 'active',
  version: 1,
};
const b: Business = { ...a, id: '00000000-0000-4000-8000-000000000002', name: 'B' };
const workspace = (business: Business): Workspace => ({ business, locations: [], members: [] });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
it('clears the previous business synchronously and ignores responses after switching or logout', async () => {
  const pending = deferred<Workspace>();
  const request = vi
    .fn()
    .mockResolvedValueOnce({ businesses: [a, b] })
    .mockResolvedValueOnce(workspace(a))
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(workspace(a));
  const model = new OrganizationModel(createOrganizationClient(request));
  await model.refresh();
  await model.select(a.id);
  expect(model.snapshot().workspace?.business.id).toBe(a.id);
  const selecting = model.select(b.id);
  expect(model.snapshot().workspace).toBeNull();
  await model.select(a.id);
  pending.resolve(workspace(b));
  await selecting;
  expect(model.snapshot().workspace?.business.id).toBe(a.id);
  const afterLogout = deferred<Workspace>();
  request.mockReturnValueOnce(afterLogout.promise);
  const loading = model.select(b.id);
  model.reset();
  afterLogout.resolve(workspace(b));
  await loading;
  expect(model.snapshot()).toMatchObject({ businesses: [], workspace: null, selectedId: null });
});
it('drops membership data after a denied refresh or failed mutation', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ businesses: [a] })
    .mockResolvedValueOnce(workspace(a));
  const model = new OrganizationModel(createOrganizationClient(request));
  await model.refresh();
  await model.select(a.id);
  await model.refresh(async () => {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  });
  expect(model.snapshot()).toMatchObject({
    businesses: [],
    workspace: null,
    error: 'Access denied',
  });
});
it('never opens child data for a suspended business', async () => {
  const request = vi.fn().mockResolvedValue({ businesses: [{ ...a, state: 'suspended' }] });
  const model = new OrganizationModel(createOrganizationClient(request));
  await model.refresh();
  await model.select(a.id);
  expect(request).toHaveBeenCalledTimes(1);
  expect(model.snapshot().workspace).toBeNull();
});

it('keeps unchanged workspace references during revalidation and clears revoked access', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ businesses: [a] })
    .mockResolvedValueOnce(workspace(a))
    .mockResolvedValueOnce({ businesses: [a] })
    .mockResolvedValueOnce(workspace(a))
    .mockResolvedValueOnce({ businesses: [] });
  const model = new OrganizationModel(createOrganizationClient(request));
  await model.refresh();
  await model.select(a.id);
  const original = model.snapshot();
  await model.revalidate();
  expect(model.snapshot()).toBe(original);
  await model.revalidate();
  expect(model.snapshot().workspace).toBeNull();
  expect(model.snapshot().selectedId).toBeNull();
});
