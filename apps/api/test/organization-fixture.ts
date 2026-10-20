import { beforeAll } from 'vitest';
import { businessSchema, locationSchema } from '@inventory/contracts';
import { authFixture, native } from './auth-fixture.js';
export function organizationFixture() {
  const { api, register, db, application } = authFixture();
  let ownerToken: string;
  let otherToken: string;
  let viewerToken: string;
  let managerToken: string;
  let ownerId: string;
  let viewerId: string;
  let managerId: string;
  let a: string;
  let b: string;
  let storeA: string;
  let storeB: string;
  let warehouseA: string;
  const root = '/api/v1/businesses';
  beforeAll(async () => {
    const owner = await register('owner@org.test');
    const other = await register('other@org.test');
    const viewer = await register('viewer@org.test');
    const manager = await register('manager@org.test');
    ownerToken = owner.token!;
    otherToken = other.token!;
    viewerToken = viewer.token!;
    managerToken = manager.token!;
    ownerId = owner.user.id;
    viewerId = viewer.user.id;
    managerId = manager.user.id;
    a = businessSchema.parse(
      (await api().post(root).set(native(ownerToken)).send({ name: 'Business A' }).expect(201))
        .body,
    ).id;
    b = businessSchema.parse(
      (await api().post(root).set(native(otherToken)).send({ name: 'Business B' }).expect(201))
        .body,
    ).id;
    for (const [email, role] of [
      ['viewer@org.test', 'viewer'],
      ['manager@org.test', 'manager'],
    ])
      await api()
        .post(`${root}/${a}/members`)
        .set(native(ownerToken))
        .send({ email, role })
        .expect(201);
    storeA = locationSchema.parse(
      (
        await api()
          .post(`${root}/${a}/locations`)
          .set(native(ownerToken))
          .send({ kind: 'stores', name: 'Store A', code: 'MAIN', type: 'branch' })
          .expect(201)
      ).body,
    ).id;
    storeB = locationSchema.parse(
      (
        await api()
          .post(`${root}/${b}/locations`)
          .set(native(otherToken))
          .send({ kind: 'stores', name: 'Store B', code: 'MAIN', type: 'store' })
          .expect(201)
      ).body,
    ).id;
    warehouseA = locationSchema.parse(
      (
        await api()
          .post(`${root}/${a}/locations`)
          .set(native(managerToken))
          .send({ kind: 'warehouses', name: 'Warehouse A', code: 'WH', storeId: storeA })
          .expect(201)
      ).body,
    ).id;
  }, 20000);
  return () => ({
    api,
    application,
    db,
    ownerToken,
    otherToken,
    viewerToken,
    managerToken,
    ownerId,
    viewerId,
    managerId,
    a,
    b,
    storeA,
    storeB,
    warehouseA,
    root,
  });
}
