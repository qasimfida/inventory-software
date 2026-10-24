import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { purchaseDetailSchema } from '@inventory/contracts';
import { purchasingFixture } from '../../test/purchasing-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = purchasingFixture();
it('returns good stock from mixed receipts, caps each condition and rolls back failed return persistence', async () => {
  const f = fixture();
  const input = {
    receiptId: f.data.receipts[0]!.id,
    quantity: '1',
    damaged: '0',
    reason: 'Supplier return',
    creditReference: 'RETURN-GUARD',
    idempotencyKey: randomUUID(),
  };
  await f.api().post(f.returnPath).set(native(f.otherToken)).send(input).expect(404);
  await f.api().post(f.returnPath).set(native(f.viewerToken)).send(input).expect(403);
  for (const [quantity, damaged, status] of [
    ['1', '2', 400],
    ['3', '3', 409],
    ['9', '0', 409],
  ] as const)
    await f
      .api()
      .post(f.returnPath)
      .set(f.h)
      .send({ ...input, quantity, damaged })
      .expect(status);
  const before = (await f.db().query('SELECT * FROM stock_balances WHERE business_id=$1', [f.a]))
    .rows;
  await f.db()
    .query(`CREATE FUNCTION fail_purchase_return() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected return failure'; END; $$;
    CREATE TRIGGER fail_purchase_return BEFORE INSERT ON purchase_returns FOR EACH ROW EXECUTE FUNCTION fail_purchase_return()`);
  await f.api().post(f.returnPath).set(f.h).send(input).expect(500);
  expect(
    (await f.db().query('SELECT * FROM stock_balances WHERE business_id=$1', [f.a])).rows,
  ).toEqual(before);
  await f
    .db()
    .query(
      'DROP TRIGGER fail_purchase_return ON purchase_returns; DROP FUNCTION fail_purchase_return()',
    );
  const detail = purchaseDetailSchema.parse(
    (await f.api().post(f.returnPath).set(f.h).send(input).expect(201)).body,
  );
  expect(detail.returns).toHaveLength(1);
  expect(detail.returns[0]!.damaged).toBe('0.000000');
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
it('requires physical good stock even when negative stock is enabled and allows remaining damaged returns', async () => {
  const f = fixture();
  await f
    .api()
    .patch(`${f.path}/stock/policy`)
    .set(f.h)
    .send({ allowNegative: true, version: 1 })
    .expect(200);
  await f
    .api()
    .post(`${f.path}/stock/movements`)
    .set(f.h)
    .send({
      warehouseId: f.warehouseA,
      variantId: f.variantId,
      unitId: f.unitId,
      type: 'sale',
      quantity: '17',
      reason: 'Consume all available good stock',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const input = {
    receiptId: f.data.receipts[0]!.id,
    quantity: '1',
    damaged: '0',
    reason: 'Unavailable return',
    creditReference: 'RETURN-PHYSICAL',
    idempotencyKey: randomUUID(),
  };
  await f.api().post(f.returnPath).set(f.h).send(input).expect(409);
  const returned = { ...input, quantity: '2', damaged: '2', idempotencyKey: randomUUID() };
  await f.api().post(f.returnPath).set(f.h).send(returned).expect(201);
  await f
    .api()
    .post(f.returnPath)
    .set(f.h)
    .send({ ...returned, idempotencyKey: randomUUID() })
    .expect(409);
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
