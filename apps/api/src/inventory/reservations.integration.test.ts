import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { stockWorkspaceSchema, reservationSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('accounts for reservations, damage, available units and release without changing physical totals', async () => {
  const { api, a, root, ownerToken, variantId, unitId, warehouseA } = fixture();
  const path = `${root}/${a}`,
    target = { variantId, unitId, warehouseId: warehouseA };
  await api()
    .post(`${path}/stock/movements`)
    .set(native(ownerToken))
    .send({
      ...target,
      type: 'opening',
      quantity: '10',
      reason: 'Opening count',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const reservation = reservationSchema.parse(
    (
      await api()
        .post(`${path}/stock/reservations`)
        .set(native(ownerToken))
        .send({
          ...target,
          quantity: '4',
          reason: 'Reserve an order',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  await api()
    .post(`${path}/stock/movements`)
    .set(native(ownerToken))
    .send({
      ...target,
      type: 'damage',
      quantity: '2',
      reason: 'Damaged goods',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const state = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(native(ownerToken)).expect(200))
      .body,
  );
  expect(state.balances[0]).toMatchObject({
    onHand: '10.000000',
    reserved: '4.000000',
    damaged: '2.000000',
    available: '4.000000',
  });
  await api()
    .post(`${path}/stock/movements`)
    .set(native(ownerToken))
    .send({
      ...target,
      type: 'sale',
      quantity: '5',
      reason: 'Insufficient available',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  const command = { reason: 'Cancel reserved order', idempotencyKey: randomUUID() };
  await api()
    .post(`${path}/stock/reservations/${reservation.id}/release`)
    .set(native(ownerToken))
    .send(command)
    .expect(201);
  await api()
    .post(`${path}/stock/reservations/${reservation.id}/release`)
    .set(native(ownerToken))
    .send(command)
    .expect(201);
  expect(
    (
      await api()
        .get(`${path}/warehouses/${warehouseA}/reconciliation`)
        .set(native(ownerToken))
        .expect(200)
    ).body.consistent,
  ).toBe(true);
});
it('allows negative stock only by explicit business policy and refuses to hide an outstanding deficit', async () => {
  const { api, a, root, ownerToken, managerToken, variantId, unitId, warehouseA } = fixture();
  const path = `${root}/${a}`,
    target = { variantId, unitId, warehouseId: warehouseA, reason: 'Policy test' };
  await api()
    .post(`${path}/stock/movements`)
    .set(native(ownerToken))
    .send({ ...target, type: 'restore', quantity: '2', idempotencyKey: randomUUID() })
    .expect(201);
  await api()
    .patch(`${path}/stock/policy`)
    .set(native(managerToken))
    .send({ allowNegative: true, version: 1 })
    .expect(403);
  await api()
    .patch(`${path}/stock/policy`)
    .set(native(ownerToken))
    .send({ allowNegative: true, version: 1 })
    .expect(200);
  await api()
    .post(`${path}/stock/movements`)
    .set(native(ownerToken))
    .send({ ...target, type: 'sale', quantity: '11', idempotencyKey: randomUUID() })
    .expect(201);
  await api()
    .patch(`${path}/stock/policy`)
    .set(native(ownerToken))
    .send({ allowNegative: false, version: 2 })
    .expect(409);
  const state = stockWorkspaceSchema.parse(
    (await api().get(`${path}/stock?warehouseId=${warehouseA}`).set(native(ownerToken)).expect(200))
      .body,
  );
  expect(state.balances[0]?.onHand).toBe('-1.000000');
  expect(
    (
      await api()
        .get(`${path}/warehouses/${warehouseA}/reconciliation`)
        .set(native(ownerToken))
        .expect(200)
    ).body.consistent,
  ).toBe(true);
});
