import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { stockPlanningSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('validates built-in/custom reasons, preserves snapshots after changes and denies non-admin policy edits', async () => {
  const { api, root, a, ownerToken, viewerToken, variantId, unitId, warehouseA } = fixture(),
    path = `${root}/${a}/stock`;
  const custom = {
    code: 'sample_loss',
    label: 'Sample loss',
    directions: ['out'],
    active: true,
    version: 0,
  };
  await api().put(`${path}/reasons`).set(native(viewerToken)).send(custom).expect(403);
  await api()
    .put(`${path}/reasons`)
    .set(native(ownerToken))
    .send({ ...custom, code: 'loss' })
    .expect(400);
  await api().put(`${path}/reasons`).set(native(ownerToken)).send(custom).expect(200);
  const post = (type: string, quantity: string, reasonCode: string) =>
    api().post(`${path}/movements`).set(native(ownerToken)).send({
      type,
      quantity,
      reasonCode,
      reason: 'Controlled reason fixture',
      variantId,
      unitId,
      warehouseId: warehouseA,
      idempotencyKey: randomUUID(),
    });
  await post('opening', '20', 'opening_balance').expect(201);
  await post('adjustment_in', '1', 'sample_loss').expect(400);
  const movement = (await post('adjustment_out', '1', 'sample_loss').expect(201)).body;
  expect(movement).toMatchObject({ reasonCode: 'sample_loss', reasonLabel: 'Sample loss' });
  await api()
    .put(`${path}/reasons`)
    .set(native(ownerToken))
    .send({ ...custom, label: 'Revised label', active: false, version: 1 })
    .expect(200);
  await post('adjustment_out', '1', 'sample_loss').expect(400);
  await api()
    .put(`${path}/reasons`)
    .set(native(ownerToken))
    .send({ ...custom, version: 1 })
    .expect(409);
  const stock = (
    await api().get(`${path}?warehouseId=${warehouseA}`).set(native(ownerToken)).expect(200)
  ).body;
  expect(stock.movements.find((m: { id: string }) => m.id === movement.id)).toMatchObject({
    reasonLabel: 'Sample loss',
  });
});
it('stores exact per-location reorder policies with concurrency checks, scope isolation and threshold alerts', async () => {
  const { api, root, a, b, ownerToken, otherToken, warehouseA, variantId, unitId, db } = fixture(),
    path = `${root}/${a}/stock`;
  const input = {
    warehouseId: warehouseA,
    variantId,
    locationId: null,
    reorderPoint: '18',
    targetQuantity: '25',
    active: true,
    version: 0,
  };
  await api()
    .put(`${path}/reorder`)
    .set(native(ownerToken))
    .send({ ...input, targetQuantity: '1' })
    .expect(400);
  await api().put(`${path}/reorder`).set(native(ownerToken)).send(input).expect(200);
  await api().put(`${path}/reorder`).set(native(ownerToken)).send(input).expect(409);
  await api()
    .put(`${path}/reorder`)
    .set(native(ownerToken))
    .send({ ...input, locationId: randomUUID(), version: 0 })
    .expect(404);
  const read = () =>
    api().get(`${path}/planning?warehouseId=${warehouseA}`).set(native(ownerToken)).expect(200);
  expect(stockPlanningSchema.parse((await read()).body).reorders[0]).toMatchObject({
    reorderPoint: '18.000000',
    available: '19.000000',
    needsReorder: false,
    version: 1,
  });
  await api()
    .post(`${path}/movements`)
    .set(native(ownerToken))
    .send({
      warehouseId: warehouseA,
      variantId,
      unitId,
      type: 'adjustment_out',
      quantity: '2',
      reasonCode: 'loss',
      reason: 'Reorder threshold fixture',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  expect(stockPlanningSchema.parse((await read()).body).reorders[0]?.needsReorder).toBe(true);
  expect(
    (
      await db().query(
        "SELECT 1 FROM organization_audit WHERE business_id=$1 AND action='stock.low'",
        [a],
      )
    ).rowCount,
  ).toBeGreaterThan(0);
  expect([403, 404]).toContain(
    (await api().get(`${path}/planning?warehouseId=${warehouseA}`).set(native(otherToken))).status,
  );
  expect([403, 404]).toContain(
    (
      await api()
        .get(`${root}/${b}/stock/planning?warehouseId=${warehouseA}`)
        .set(native(ownerToken))
    ).status,
  );
  await api().get(`${path}/planning?warehouseId=${warehouseA}`).expect(401);
});
