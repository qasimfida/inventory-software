import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { storageWorkspaceSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('enforces ranked hierarchy, scoped uniqueness, deactivation and ledger-backed bin moves', async () => {
  const { api, root, a, ownerToken, otherToken, warehouseA, variantId, unitId } = fixture(),
    path = `${root}/${a}`,
    h = native(ownerToken);
  const zone = {
    warehouseId: warehouseA,
    parentId: warehouseA,
    name: 'Zone A',
    code: 'ZONE-A',
    type: 'zone',
  };
  const zoneId = String(
    (await api().post(`${path}/storage`).set(h).send(zone).expect(201)).body.id,
  );
  await api().post(`${path}/storage`).set(h).send(zone).expect(409);
  const bin = {
    ...zone,
    parentId: zoneId,
    name: 'Bin 1',
    code: 'BIN-1',
    type: 'bin',
    capacity: '20',
    capacityUnit: 'units',
    photos: ['https://example.com/bin.jpg'],
  };
  const binId = String((await api().post(`${path}/storage`).set(h).send(bin).expect(201)).body.id);
  await api()
    .patch(`${path}/storage/${zoneId}`)
    .set(h)
    .send({ ...zone, parentId: binId, version: 1 })
    .expect(409);
  await api()
    .patch(`${path}/storage/${zoneId}`)
    .set(h)
    .send({ ...zone, state: 'inactive', version: 1 })
    .expect(409);
  await api()
    .post(`${path}/storage`)
    .set(h)
    .send({ ...zone, parentId: binId, code: 'INVALID' })
    .expect(409);
  await api().get(`${path}/storage?warehouseId=${warehouseA}`).set(native(otherToken)).expect(404);
  const opening = {
    warehouseId: warehouseA,
    variantId,
    unitId,
    quantity: '10',
    type: 'opening',
    reason: 'Opening count',
    idempotencyKey: randomUUID(),
  };
  await api().post(`${path}/stock/movements`).set(h).send(opening).expect(201);
  const move = {
    warehouseId: warehouseA,
    sourceId: warehouseA,
    destinationId: binId,
    variantId,
    unitId,
    quantity: '3',
    reason: 'Putaway',
    idempotencyKey: randomUUID(),
  };
  await api().post(`${path}/storage/moves`).set(h).send(move).expect(201);
  await api().post(`${path}/storage/moves`).set(h).send(move).expect(201);
  await api()
    .patch(`${path}/storage/${binId}`)
    .set(h)
    .send({ ...bin, state: 'inactive', version: 1 })
    .expect(409);
  let state = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(state.balances.find((b) => b.locationId === binId)?.onHand).toBe('3.000000');
  expect(state.balances.find((b) => b.locationId === warehouseA)?.onHand).toBe('7.000000');
  const storage = storageWorkspaceSchema.parse(
    (
      await api()
        .get(`${path}/storage?warehouseId=${warehouseA}&search=BIN&type=bin`)
        .set(h)
        .expect(200)
    ).body,
  );
  expect(storage.locations).toHaveLength(1);
  expect(storage.totals[0]?.onHand).toBe('10.000000');
  await api()
    .post(`${path}/storage/moves`)
    .set(h)
    .send({
      ...move,
      sourceId: binId,
      destinationId: warehouseA,
      quantity: '4',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  await api()
    .post(`${path}/storage/moves`)
    .set(h)
    .send({ ...move, sourceId: binId, destinationId: warehouseA, idempotencyKey: randomUUID() })
    .expect(201);
  await api()
    .patch(`${path}/storage/${binId}`)
    .set(h)
    .send({ ...bin, state: 'inactive', version: 1 })
    .expect(200);
  await api()
    .post(`${path}/storage/moves`)
    .set(h)
    .send({ ...move, idempotencyKey: randomUUID() })
    .expect(404);
  state = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(h).expect(200)).body,
  );
  expect(state.balances.find((b) => b.locationId === warehouseA)?.onHand).toBe('10.000000');
  expect(
    (await api().get(`${path}/warehouses/${warehouseA}/reconciliation`).set(h).expect(200)).body
      .consistent,
  ).toBe(true);
});
