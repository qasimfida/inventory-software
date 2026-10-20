import { expect, it } from 'vitest';
import { workspaceSchema, auditListSchema } from '@inventory/contracts';
import { native } from '../../test/auth-fixture.js';
import { organizationFixture } from '../../test/organization-fixture.js';
const fixture = organizationFixture();
it('enforces warehouse-scoped manager visibility, mutation and audit history', async () => {
  const { api, a, b, root, ownerToken, managerToken, managerId, storeA, warehouseA } = fixture();
  const extra = await api()
    .post(`${root}/${a}/locations`)
    .set(native(ownerToken))
    .send({ kind: 'warehouses', storeId: storeA, name: 'Private', code: 'PRIVATE' })
    .expect(201);
  await api()
    .patch(`${root}/${a}/members/${managerId}`)
    .set(native(ownerToken))
    .send({
      role: 'manager',
      state: 'active',
      version: 1,
      scope: { storeId: storeA, warehouseId: warehouseA },
    })
    .expect(200);
  const view = workspaceSchema.parse(
    (await api().get(`${root}/${a}`).set(native(managerToken)).expect(200)).body,
  );
  expect(view.locations.map((l) => l.id).sort()).toEqual([storeA, warehouseA].sort());
  expect(view.members).toEqual([]);
  for (const [kind, id] of [
    ['warehouses', extra.body.id],
    ['stores', storeA],
  ])
    await api()
      .patch(`${root}/${a}/locations/${kind}/${id}`)
      .set(native(managerToken))
      .send({ name: 'Denied', code: 'DENIED', state: 'active', version: 1 })
      .expect(404);
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(managerToken))
    .send({ kind: 'warehouses', storeId: storeA, name: 'Denied', code: 'DENIED' })
    .expect(403);
  await api()
    .patch(`${root}/${a}/locations/warehouses/${warehouseA}`)
    .set(native(managerToken))
    .send({ name: 'Allowed', code: 'WH', state: 'active', version: 1 })
    .expect(200);
  const history = auditListSchema.parse(
    (await api().get(`${root}/${a}/audit`).set(native(managerToken)).expect(200)).body,
  );
  expect(history.events.length).toBeGreaterThan(0);
  expect(history.events.every((e) => e.storeId === storeA && e.warehouseId === warehouseA)).toBe(
    true,
  );
  expect(JSON.stringify(history)).not.toContain('@org.test');
  await api().get(`${root}/${b}/audit`).set(native(managerToken)).expect(404);
});
it('denies forged platform roles, custom delegation, foreign scopes and non-owner role editing', async () => {
  const { api, a, root, ownerToken, managerToken, viewerId, storeB, storeA, warehouseA } =
    fixture();
  const path = `${root}/${a}/members/${viewerId}`;
  for (const fields of [
    { role: 'super_admin' },
    { role: 'custom', permissions: ['users.write'] },
    { role: 'owner', scope: { storeId: storeA, warehouseId: null } },
    { role: 'cashier', isSuperAdmin: true },
    { role: 'custom', permissions: ['unknown.read'] },
  ])
    await api()
      .patch(path)
      .set(native(ownerToken))
      .send({ state: 'active', version: 1, ...fields })
      .expect(400);
  await api()
    .patch(path)
    .set(native(ownerToken))
    .send({
      role: 'manager',
      state: 'active',
      version: 1,
      scope: { storeId: storeB, warehouseId: null },
    })
    .expect(404);
  await api()
    .patch(path)
    .set(native(managerToken))
    .send({ role: 'owner', state: 'active', version: 1 })
    .expect(403);
  await api()
    .patch(path)
    .set(native(ownerToken))
    .send({
      role: 'cashier',
      state: 'active',
      version: 1,
      scope: { storeId: storeA, warehouseId: warehouseA },
    })
    .expect(200);
});
it('cashiers cannot change locations or read audit and custom roles receive only explicit grants', async () => {
  const { api, a, root, ownerToken, viewerToken, viewerId, warehouseA } = fixture();
  await api().get(`${root}/${a}/audit`).set(native(viewerToken)).expect(403);
  await api()
    .patch(`${root}/${a}/locations/warehouses/${warehouseA}`)
    .set(native(viewerToken))
    .send({ name: 'Denied', code: 'WH', state: 'active', version: 2 })
    .expect(403);
  await api()
    .patch(`${root}/${a}/members/${viewerId}`)
    .set(native(ownerToken))
    .send({ role: 'custom', state: 'active', version: 2, permissions: ['audit.read'] })
    .expect(200);
  const workspace = workspaceSchema.parse(
    (await api().get(`${root}/${a}`).set(native(viewerToken)).expect(200)).body,
  );
  expect(workspace.locations).toEqual([]);
  expect(workspace.members).toEqual([]);
  await api().get(`${root}/${a}/audit`).set(native(viewerToken)).expect(200);
  await api()
    .patch(`${root}/${a}`)
    .set(native(viewerToken))
    .send({ name: 'Denied', state: 'active', version: 1 })
    .expect(403);
});
it('platform administration is server-derived and audit is append-only', async () => {
  const { api, db, a, b, root, viewerToken, viewerId, ownerToken } = fixture();
  await api().get(`${root}/${b}`).set(native(viewerToken)).expect(404);
  await db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [viewerId]);
  const view = workspaceSchema.parse(
    (await api().get(`${root}/${b}`).set(native(viewerToken)).expect(200)).body,
  );
  expect(view.business.role).toBe('super_admin');
  expect((await api().get(root).set(native(viewerToken)).expect(200)).body.businesses).toHaveLength(
    2,
  );
  await db().query('DELETE FROM platform_administrators WHERE account_id=$1', [viewerId]);
  await api().get(`${root}/${b}`).set(native(viewerToken)).expect(404);
  await expect(
    db().query('UPDATE organization_audit SET action=$1 WHERE business_id=$2', ['forged', a]),
  ).rejects.toThrow('append-only');
  await api().delete(`${root}/${a}/audit`).set(native(ownerToken)).expect(404);
});
