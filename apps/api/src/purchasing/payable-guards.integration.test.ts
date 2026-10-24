import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = purchasingFixture();
it('enforces financial permissions, tenant/warehouse scope and strict payment inputs', async () => {
  const f = fixture(),
    path = `${f.payablePath}/settlements`;
  const input = {
    kind: 'payment',
    amountMinor: '100',
    reference: 'GUARD-1',
    idempotencyKey: randomUUID(),
  };
  await f.api().get(f.payablePath).set(native(f.otherToken)).expect(404);
  await f.api().post(path).set(native(f.otherToken)).send(input).expect(404);
  await f.api().get(f.payablePath).set(native(f.viewerToken)).expect(403);
  await f
    .api()
    .patch(`${f.path}/members/${f.viewerId}`)
    .set(f.h)
    .send({
      role: 'cashier',
      state: 'active',
      version: 1,
      scope: { storeId: f.storeA, warehouseId: f.warehouseA },
    })
    .expect(200);
  await f.api().get(f.payablePath).set(native(f.viewerToken)).expect(403);
  await f.api().post(path).set(native(f.viewerToken)).send(input).expect(403);
  await f
    .api()
    .patch(`${f.path}/members/${f.viewerId}`)
    .set(f.h)
    .send({
      role: 'custom',
      state: 'active',
      version: 2,
      permissions: ['payments.read', 'purchases.read'],
      scope: { storeId: f.storeA, warehouseId: f.warehouseA },
    })
    .expect(200);
  await f.api().get(f.payablePath).set(native(f.viewerToken)).expect(200);
  await f.api().post(path).set(native(f.viewerToken)).send(input).expect(403);
  const otherWarehouse = (
    await f
      .api()
      .post(`${f.path}/locations`)
      .set(f.h)
      .send({
        kind: 'warehouses',
        name: 'Hidden warehouse',
        code: 'HIDDEN',
        storeId: f.storeA,
      })
      .expect(201)
  ).body;
  await f
    .api()
    .get(`${f.path}/payables?warehouseId=${otherWarehouse.id}`)
    .set(native(f.viewerToken))
    .expect(404);
  await f
    .api()
    .patch(`${f.path}/members/${f.viewerId}`)
    .set(f.h)
    .send({
      role: 'custom',
      state: 'active',
      version: 3,
      permissions: ['payments.read', 'purchases.read'],
      scope: { storeId: f.storeA, warehouseId: otherWarehouse.id },
    })
    .expect(200);
  await f.api().get(f.payablePath).set(native(f.viewerToken)).expect(404);
  for (const extra of [
    { amountMinor: '0' },
    { amountMinor: '-1' },
    { amountMinor: '1.1' },
    { currency: 'EUR' },
    { kind: 'card' },
  ])
    await f
      .api()
      .post(path)
      .set(f.h)
      .send({ ...input, ...extra })
      .expect(400);
  await f
    .api()
    .post(`${f.payablePath}/credits`)
    .set(f.h)
    .send({
      returnId: randomUUID(),
      amountMinor: '10',
      reference: 'BAD-RETURN',
      reason: 'Wrong linked return',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
});
it('rolls back cash and idempotency on failure, serializes competing payments and refuses closed shifts', async () => {
  const f = fixture(),
    path = `${f.payablePath}/settlements`;
  const input = {
    kind: 'payment',
    amountMinor: '700',
    reference: 'RACE-A',
    idempotencyKey: randomUUID(),
  };
  await f.db()
    .query(`CREATE FUNCTION fail_supplier_cash() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected cash failure'; END; $$;
    CREATE TRIGGER fail_supplier_cash BEFORE INSERT ON cash_entries FOR EACH ROW EXECUTE FUNCTION fail_supplier_cash()`);
  await f.api().post(path).set(f.h).send(input).expect(500);
  expect(
    (await f.db().query('SELECT * FROM supplier_settlements WHERE business_id=$1', [f.a])).rowCount,
  ).toBe(0);
  await f
    .db()
    .query('DROP TRIGGER fail_supplier_cash ON cash_entries; DROP FUNCTION fail_supplier_cash()');
  const replies = await Promise.all(
    [input, { ...input, reference: 'RACE-B', idempotencyKey: randomUUID() }].map((value) =>
      f.api().post(path).set(f.h).send(value),
    ),
  );
  expect(replies.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(
    (await f.api().get(f.payablePath).set(f.h).expect(200)).body.invoice.outstandingMinor,
  ).toBe('300');
  const shift = (
    await f.api().get(`${f.path}/cash-shifts?warehouseId=${f.warehouseA}`).set(f.h).expect(200)
  ).body.shifts[0];
  await f
    .api()
    .post(`${f.path}/cash-shifts/${shift.id}/entries`)
    .set(f.h)
    .send({
      kind: 'cash_out',
      amountMinor: '9260',
      reference: 'Leave forty minor units',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await f
    .api()
    .post(path)
    .set(f.h)
    .send({
      ...input,
      amountMinor: '300',
      reference: 'INSUFFICIENT-CASH',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  await f
    .api()
    .post(`${f.path}/cash-shifts/${shift.id}/close`)
    .set(f.h)
    .send({
      countedMinor: '40',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await f
    .api()
    .post(path)
    .set(f.h)
    .send({
      ...input,
      amountMinor: '300',
      reference: 'CLOSED',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  expect(
    (await f.api().get(f.payablePath).set(f.h).expect(200)).body.invoice.outstandingMinor,
  ).toBe('300');
});
