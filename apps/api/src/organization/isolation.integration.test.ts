import { expect, it } from 'vitest';
import { native } from '../../test/auth-fixture.js';
import { organizationFixture } from '../../test/organization-fixture.js';
const fixture = organizationFixture();
import { randomUUID } from 'node:crypto';
import { workspaceSchema } from '@inventory/contracts';
it('requires authentication and never lists or opens another business', async () => {
  const { api, ownerToken, viewerToken, a, b, storeB, root } = fixture();
  await api().get(root).expect(401);
  const list = await api().get(root).set(native(ownerToken)).expect(200);
  expect(list.body.businesses.map((item: { id: string }) => item.id)).toEqual([a]);
  for (const path of [`/${b}`, `/${b}/audit`, `/${randomUUID()}`])
    await api()
      .get(root + path)
      .set(native(ownerToken))
      .expect(404);
  await api()
    .patch(`${root}/${b}`)
    .set(native(ownerToken))
    .send({ name: 'Stolen', state: 'active', version: 1 })
    .expect(404);
  const view = workspaceSchema.parse(
    (await api().get(`${root}/${a}`).set(native(viewerToken)).expect(200)).body,
  );
  expect(view.members).toEqual([]);
  expect(view.locations.every((item) => item.id !== storeB)).toBe(true);
});
it('rejects forged context, cross-business parents and child IDs on every mutation surface', async () => {
  const { api, db, ownerToken, ownerId, a, b, storeB, warehouseA, root } = fixture();
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(ownerToken))
    .send({ kind: 'stores', name: 'X', code: 'X', type: 'store', businessId: b })
    .expect(400);
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(ownerToken))
    .send({ kind: 'warehouses', name: 'X', code: 'X', storeId: storeB })
    .expect(404);
  await api()
    .post(`${root}/${b}/locations`)
    .set(native(ownerToken))
    .send({ kind: 'stores', name: 'X', code: 'X', type: 'store' })
    .expect(404);
  await api()
    .patch(`${root}/${a}/locations/stores/${storeB}`)
    .set(native(ownerToken))
    .send({ name: 'Stolen', code: 'MAIN', state: 'archived', version: 1 })
    .expect(404);
  await api()
    .patch(`${root}/${b}/members/${ownerId}`)
    .set(native(ownerToken))
    .send({ role: 'owner', state: 'active', version: 1 })
    .expect(404);
  await api()
    .post(`${root}/${b}/members`)
    .set(native(ownerToken))
    .send({ email: 'owner@org.test', role: 'owner' })
    .expect(404);
  await expect(
    db().query('INSERT INTO warehouses(id,business_id,store_id,name,code) VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      a,
      storeB,
      'Cross tenant',
      'CROSS',
    ]),
  ).rejects.toMatchObject({ code: '23503' });
  await expect(
    db().query(
      'INSERT INTO terminals(id,business_id,store_id,warehouse_id,name,code,type) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(), b, storeB, warehouseA, 'Cross tenant', 'CROSS', 'pos'],
    ),
  ).rejects.toMatchObject({ code: '23503' });
});
it('enforces owner/manager/viewer capabilities and rejects duplicate codes atomically', async () => {
  const { api, db, viewerToken, managerToken, managerId, a, root } = fixture();
  for (const token of [viewerToken, managerToken]) {
    await api()
      .patch(`${root}/${a}`)
      .set(native(token))
      .send({ name: 'Renamed', state: 'active', version: 1 })
      .expect(403);
    await api()
      .post(`${root}/${a}/members`)
      .set(native(token))
      .send({ email: 'other@org.test', role: 'owner' })
      .expect(403);
    await api()
      .patch(`${root}/${a}/members/${managerId}`)
      .set(native(token))
      .send({ role: 'owner', state: 'active', version: 1 })
      .expect(403);
    await api()
      .get(`${root}/${a}/audit`)
      .set(native(token))
      .expect(token === viewerToken ? 403 : 200);
  }
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(viewerToken))
    .send({ kind: 'stores', name: 'No', code: 'NO', type: 'store' })
    .expect(403);
  const count = (
    await db().query('SELECT count(*) FROM organization_audit WHERE business_id=$1', [a])
  ).rows[0].count;
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(managerToken))
    .send({ kind: 'stores', name: 'Duplicate', code: 'main', type: 'store' })
    .expect(409);
  expect(
    (await db().query('SELECT count(*) FROM organization_audit WHERE business_id=$1', [a])).rows[0]
      .count,
  ).toBe(count);
});
it('rejects a warehouse from another store even within the same business', async () => {
  const { api, db, a, ownerToken, warehouseA, root } = fixture();
  const second = await api()
    .post(`${root}/${a}/locations`)
    .set(native(ownerToken))
    .send({ kind: 'stores', name: 'Second', code: 'SECOND', type: 'store' })
    .expect(201);
  const storeId = (second.body as { id: string }).id;
  await api()
    .post(`${root}/${a}/locations`)
    .set(native(ownerToken))
    .send({
      kind: 'terminals',
      name: 'Mismatch',
      code: 'MISMATCH',
      type: 'pos',
      storeId,
      warehouseId: warehouseA,
    })
    .expect(409);
  await expect(
    db().query(
      'INSERT INTO terminals(id,business_id,store_id,warehouse_id,name,code,type) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(), a, storeId, warehouseA, 'Mismatch', 'MISMATCH', 'pos'],
    ),
  ).rejects.toMatchObject({ code: '23503' });
});
