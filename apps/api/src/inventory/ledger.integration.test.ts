import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { movementSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
let openingId: string;
it('posts opening stock exactly once for duplicate concurrent requests', async () => {
  const { api, a, root, ownerToken, variantId, unitId, warehouseA, db } = fixture();
  const input = {
    variantId,
    unitId,
    warehouseId: warehouseA,
    type: 'opening',
    quantity: '10',
    reason: 'Opening count',
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all([
    api().post(`${root}/${a}/stock/movements`).set(native(ownerToken)).send(input),
    api().post(`${root}/${a}/stock/movements`).set(native(ownerToken)).send(input),
  ]);
  expect(results.map((r) => r.status)).toEqual([201, 201]);
  openingId = movementSchema.parse(results[0].body).id;
  expect(movementSchema.parse(results[1].body).id).toBe(openingId);
  expect(
    (await db().query('SELECT count(*) FROM stock_movements WHERE business_id=$1', [a])).rows[0]
      .count,
  ).toBe('1');
  await api()
    .post(`${root}/${a}/stock/movements`)
    .set(native(ownerToken))
    .send({ ...input, quantity: '11' })
    .expect(409);
});
it('serializes simultaneous sales, rejects overselling, and rolls back failed projections and receipts', async () => {
  const { api, a, root, ownerToken, variantId, unitId, warehouseA, db } = fixture();
  const requests = [randomUUID(), randomUUID()].map((key) => ({
    variantId,
    unitId,
    warehouseId: warehouseA,
    type: 'sale',
    quantity: '7',
    reason: 'Sale reference',
    idempotencyKey: key,
  }));
  const results = await Promise.all(
    requests.map((input) =>
      api().post(`${root}/${a}/stock/movements`).set(native(ownerToken)).send(input),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  const failed = requests[results.findIndex((r) => r.status === 409)]!;
  expect(
    (
      await db().query('SELECT 1 FROM operation_receipts WHERE idempotency_key=$1', [
        failed.idempotencyKey,
      ])
    ).rowCount,
  ).toBe(0);
  const state = stockWorkspaceSchema.parse(
    (
      await api()
        .get(`${root}/${a}/stock?warehouseId=${warehouseA}`)
        .set(native(ownerToken))
        .expect(200)
    ).body,
  );
  expect(state.balances[0]?.onHand).toBe('3.000000');
  expect(
    (
      await api()
        .get(`${root}/${a}/warehouses/${warehouseA}/reconciliation`)
        .set(native(ownerToken))
        .expect(200)
    ).body.consistent,
  ).toBe(true);
  // Force a failure after the movement INSERT but before its balance UPDATE to prove atomic rollback.
  await db().query(
    "CREATE FUNCTION fail_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$",
  );
  await db().query(
    'CREATE TRIGGER test_projection_failure BEFORE UPDATE ON stock_balances FOR EACH ROW EXECUTE FUNCTION fail_projection()',
  );
  const key = randomUUID();
  await api()
    .post(`${root}/${a}/stock/movements`)
    .set(native(ownerToken))
    .send({ ...failed, type: 'receive', quantity: '1', idempotencyKey: key })
    .expect(500);
  await db().query('DROP TRIGGER test_projection_failure ON stock_balances');
  await db().query('DROP FUNCTION fail_projection()');
  expect(
    (await db().query('SELECT 1 FROM stock_movements WHERE command_id=$1', [key])).rowCount,
  ).toBe(0);
  expect(
    (await db().query('SELECT 1 FROM operation_receipts WHERE idempotency_key=$1', [key])).rowCount,
  ).toBe(0);
});
it('uses explicit reversals and prevents history mutation, foreign access and unsafe archiving', async () => {
  const {
    api,
    a,
    b,
    root,
    ownerToken,
    otherToken,
    viewerToken,
    variantId,
    unitId,
    warehouseA,
    db,
  } = fixture();
  await api()
    .get(`${root}/${a}/stock?warehouseId=${warehouseA}`)
    .set(native(viewerToken))
    .expect(403);
  await api()
    .get(`${root}/${b}/stock?warehouseId=${warehouseA}`)
    .set(native(otherToken))
    .expect(404);
  await api()
    .post(`${root}/${b}/stock/movements/${openingId}/reverse`)
    .set(native(otherToken))
    .send({ reason: 'Foreign reverse', idempotencyKey: randomUUID() })
    .expect(404);
  await expect(
    db().query('UPDATE stock_movements SET quantity_delta=0 WHERE business_id=$1', [a]),
  ).rejects.toThrow('append-only');
  await api()
    .patch(`${root}/${a}/products/${variantId}`)
    .set(native(ownerToken))
    .send({ name: 'Stock item', sku: 'STOCK', state: 'archived', version: 1 })
    .expect(409);
  const received = movementSchema.parse(
    (
      await api()
        .post(`${root}/${a}/stock/movements`)
        .set(native(ownerToken))
        .send({
          variantId,
          unitId,
          warehouseId: warehouseA,
          type: 'receive',
          quantity: '2',
          reason: 'Receipt correction',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const input = { reason: 'Reverse incorrect receipt', idempotencyKey: randomUUID() };
  const reverse = movementSchema.parse(
    (
      await api()
        .post(`${root}/${a}/stock/movements/${received.id}/reverse`)
        .set(native(ownerToken))
        .send(input)
        .expect(201)
    ).body,
  );
  expect(reverse.quantityDelta).toBe('-2.000000');
  await api()
    .post(`${root}/${a}/stock/movements/${received.id}/reverse`)
    .set(native(ownerToken))
    .send({ ...input, idempotencyKey: randomUUID() })
    .expect(409);
  expect(
    (
      await api()
        .get(`${root}/${a}/warehouses/${warehouseA}/reconciliation`)
        .set(native(ownerToken))
        .expect(200)
    ).body.consistent,
  ).toBe(true);
});
