import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { StockExpiry } from './stock-expiry.js';
const fixture = stockFixture();
let holdId: string;
it('owns holds, prevents overselling, replays stable IDs and rolls back duplicate references', async () => {
  const { api, root, a, ownerToken, variantId, unitId, warehouseA, db } = fixture(),
    path = `${root}/${a}/stock`;
  await api()
    .post(`${path}/movements`)
    .set(native(ownerToken))
    .send({
      variantId,
      unitId,
      warehouseId: warehouseA,
      type: 'opening',
      quantity: '5',
      reason: 'Hold fixture',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const input = {
    variantId,
    unitId,
    warehouseId: warehouseA,
    quantity: '3',
    reference: 'ORDER-001',
    expiresInMinutes: 30,
    reason: 'Order allocation fixture',
    idempotencyKey: randomUUID(),
  };
  const replies = await Promise.all([
    api().post(`${path}/holds`).set(native(ownerToken)).send(input),
    api().post(`${path}/holds`).set(native(ownerToken)).send(input),
  ]);
  expect(replies.map((r) => r.status)).toEqual([201, 201]);
  holdId = replies[0].body.id;
  expect(replies[1].body.id).toBe(holdId);
  await api()
    .post(`${path}/holds`)
    .set(native(ownerToken))
    .send({ ...input, idempotencyKey: randomUUID(), quantity: '1' })
    .expect(409);
  await api()
    .post(`${path}/holds`)
    .set(native(ownerToken))
    .send({ ...input, idempotencyKey: randomUUID(), reference: 'ORDER-002' })
    .expect(409);
  expect(
    (
      await db().query(
        'SELECT on_hand::text,reserved::text FROM stock_balances WHERE business_id=$1',
        [a],
      )
    ).rows[0],
  ).toMatchObject({ on_hand: '5.000000', reserved: '3.000000' });
  const hold = (
    await api()
      .get(`${path}/planning?warehouseId=${warehouseA}`)
      .set(native(ownerToken))
      .expect(200)
  ).body.holds[0];
  expect(hold).toMatchObject({
    id: holdId,
    reference: 'ORDER-001',
    remaining: '3.000000',
    state: 'open',
  });
  await api()
    .post(`${path}/reservations/${hold.reservationId}/release`)
    .set(native(ownerToken))
    .send({ reason: 'Wrong lifecycle', idempotencyKey: randomUUID() })
    .expect(409);
  expect(
    (await db().query('SELECT count(*) FROM sales WHERE business_id=$1', [a])).rows[0].count,
  ).toBe('0');
});
it('cancels once, rejects foreign access and keeps the stock ledger reconciled', async () => {
  const { api, root, a, ownerToken, otherToken, viewerToken, warehouseA } = fixture(),
    path = `${root}/${a}/stock`;
  const command = { reason: 'Customer cancelled order', idempotencyKey: randomUUID() };
  expect([403, 404]).toContain(
    (await api().post(`${path}/holds/${holdId}/cancel`).set(native(otherToken)).send(command))
      .status,
  );
  await api()
    .post(`${path}/holds/${holdId}/cancel`)
    .set(native(viewerToken))
    .send(command)
    .expect(403);
  await api()
    .post(`${path}/holds/${holdId}/cancel`)
    .set(native(ownerToken))
    .send(command)
    .expect(201);
  await api()
    .post(`${path}/holds/${holdId}/cancel`)
    .set(native(ownerToken))
    .send(command)
    .expect(201);
  await api()
    .post(`${path}/holds/${holdId}/cancel`)
    .set(native(ownerToken))
    .send({ ...command, idempotencyKey: randomUUID() })
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
it('expires durably once even after holder revocation and product deactivation, without physical or cash effects', async () => {
  const { api, root, a, ownerToken, ownerId, variantId, unitId, warehouseA, db, application } =
      fixture(),
    path = `${root}/${a}/stock`;
  const result = await api()
    .post(`${path}/holds`)
    .set(native(ownerToken))
    .send({
      variantId,
      unitId,
      warehouseId: warehouseA,
      quantity: '2',
      reference: 'ORDER-EXPIRY',
      expiresInMinutes: 1,
      reason: 'Expiry fixture',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await db().query(
    "UPDATE stock_hold_orders SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE business_id=$1 AND id=$2",
    [a, result.body.id],
  );
  await db().query("UPDATE catalog_products SET state='inactive' WHERE business_id=$1 AND id=$2", [
    a,
    variantId,
  ]);
  await db().query(
    "UPDATE business_memberships SET state='suspended' WHERE business_id=$1 AND account_id=$2",
    [a, ownerId],
  );
  const worker = application().get(StockExpiry);
  await Promise.all([worker.flush(), worker.flush()]);
  await worker.flush();
  expect(
    (await db().query('SELECT state FROM stock_hold_orders WHERE id=$1', [result.body.id])).rows[0]
      .state,
  ).toBe('expired');
  expect(
    (
      await db().query(
        'SELECT on_hand::text,reserved::text FROM stock_balances WHERE business_id=$1',
        [a],
      )
    ).rows[0],
  ).toMatchObject({ on_hand: '5.000000', reserved: '0.000000' });
  expect(
    (
      await db().query(
        "SELECT count(*) FROM stock_movements WHERE business_id=$1 AND type='release'",
        [a],
      )
    ).rows[0].count,
  ).toBe('2');
  expect(
    (await db().query('SELECT count(*) FROM sales WHERE business_id=$1', [a])).rows[0].count,
  ).toBe('0');
});
