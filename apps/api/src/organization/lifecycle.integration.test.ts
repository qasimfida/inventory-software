import { expect, it } from 'vitest';
import { native } from '../../test/auth-fixture.js';
import { organizationFixture } from '../../test/organization-fixture.js';
const fixture = organizationFixture();
import { locationSchema } from '@inventory/contracts';
it('enforces parent lifecycles, optimistic versions and irreversible archival', async () => {
  const { api, managerToken, a, storeA, warehouseA, root } = fixture();
  const terminal = locationSchema.parse(
    (
      await api()
        .post(`${root}/${a}/locations`)
        .set(native(managerToken))
        .send({
          kind: 'terminals',
          name: 'Till',
          code: 'POS',
          storeId: storeA,
          warehouseId: warehouseA,
          type: 'pos',
        })
        .expect(201)
    ).body,
  );
  const warehouse = { name: 'Warehouse A', code: 'WH', state: 'suspended', version: 1 };
  await api()
    .patch(`${root}/${a}/locations/warehouses/${warehouseA}`)
    .set(native(managerToken))
    .send(warehouse)
    .expect(409);
  await api()
    .patch(`${root}/${a}/locations/terminals/${terminal.id}`)
    .set(native(managerToken))
    .send({ name: 'Till', code: 'POS', state: 'archived', version: 1 })
    .expect(200);
  await api()
    .patch(`${root}/${a}/locations/terminals/${terminal.id}`)
    .set(native(managerToken))
    .send({ name: 'Till', code: 'POS', state: 'active', version: 2 })
    .expect(409);
  await api()
    .patch(`${root}/${a}/locations/warehouses/${warehouseA}`)
    .set(native(managerToken))
    .send(warehouse)
    .expect(200);
  await api()
    .patch(`${root}/${a}/locations/warehouses/${warehouseA}`)
    .set(native(managerToken))
    .send(warehouse)
    .expect(409);
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(managerToken))
    .send({
      kind: 'terminals',
      name: 'Blocked',
      code: 'BLOCK',
      storeId: storeA,
      warehouseId: warehouseA,
      type: 'pos',
    })
    .expect(409);
});
it('applies membership deactivation immediately without changing the login session', async () => {
  const { api, ownerToken, viewerToken, viewerId, a, root } = fixture();
  await api()
    .patch(`${root}/${a}/members/${viewerId}`)
    .set(native(ownerToken))
    .send({ role: 'viewer', state: 'suspended', version: 1 })
    .expect(200);
  await api().get(`${root}/${a}`).set(native(viewerToken)).expect(404);
  expect((await api().get(root).set(native(viewerToken)).expect(200)).body.businesses).toEqual([]);
  await api().get('/api/v1/auth/session').set(native(viewerToken)).expect(200);
  await api()
    .patch(`${root}/${a}/members/${viewerId}`)
    .set(native(ownerToken))
    .send({ role: 'viewer', state: 'active', version: 2 })
    .expect(200);
  await api().get(`${root}/${a}`).set(native(viewerToken)).expect(200);
});
it('preserves the last owner under concurrent changes and records immutable scoped audit events', async () => {
  const { api, db, ownerToken, managerToken, ownerId, managerId, a, root } = fixture();
  await api()
    .patch(`${root}/${a}/members/${ownerId}`)
    .set(native(ownerToken))
    .send({ role: 'viewer', state: 'active', version: 1 })
    .expect(409);
  await api()
    .patch(`${root}/${a}/members/${managerId}`)
    .set(native(ownerToken))
    .send({ role: 'owner', state: 'active', version: 1 })
    .expect(200);
  const results = await Promise.all([
    api()
      .patch(`${root}/${a}/members/${ownerId}`)
      .set(native(ownerToken))
      .send({ role: 'viewer', state: 'active', version: 1 }),
    api()
      .patch(`${root}/${a}/members/${managerId}`)
      .set(native(managerToken))
      .send({ role: 'viewer', state: 'active', version: 2 }),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  const finalOwner = (
    await db().query(
      "SELECT account_id FROM business_memberships WHERE business_id=$1 AND role='owner' AND state='active'",
      [a],
    )
  ).rows[0].account_id;
  const token = finalOwner === ownerId ? ownerToken : managerToken;
  const history = await api().get(`${root}/${a}/audit`).set(native(token)).expect(200);
  expect(
    history.body.events.every((event: { actorEmail: string | null }) =>
      event.actorEmail?.includes('@'),
    ),
  ).toBe(true);
  expect(
    history.body.events.some((event: { action: string }) => event.action === 'business.created'),
  ).toBe(true);
  expect(
    history.body.events.every((event: { requestId: string }) =>
      /^[0-9a-f-]{36}$/.test(event.requestId),
    ),
  ).toBe(true);
  await expect(
    db().query('DELETE FROM organization_audit WHERE business_id=$1', [a]),
  ).rejects.toThrow('append-only');
  await api()
    .patch(`${root}/${a}`)
    .set(native(token))
    .send({ name: 'Business A', state: 'suspended', version: 1 })
    .expect(200);
  await api().get(`${root}/${a}`).set(native(token)).expect(403);
  await api()
    .patch(`${root}/${a}`)
    .set(native(token))
    .send({ name: 'Business A', state: 'active', version: 2 })
    .expect(200);
  await api()
    .patch(`${root}/${a}`)
    .set(native(token))
    .send({ name: 'Business A', state: 'archived', version: 3 })
    .expect(200);
  await api()
    .patch(`${root}/${a}`)
    .set(native(token))
    .send({ name: 'Business A', state: 'active', version: 4 })
    .expect(409);
});
