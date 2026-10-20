import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { purchaseDetailSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('records partial damaged receipts atomically, retains operator/time, and rejects unknown lines and locations', async () => {
  const f = fixture();
  const supplier = (
    await f
      .api()
      .post(`${f.path}/suppliers`)
      .set(f.h)
      .send({ name: 'Damage supplier', code: 'DAM' })
      .expect(201)
  ).body;
  let d = purchaseDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/purchases`)
        .set(f.h)
        .send({
          supplierId: supplier.id,
          warehouseId: f.warehouseA,
          reference: 'DAMAGED',
          currency: 'USD',
          lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '10', unitCost: '1' }],
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  for (const action of ['approve', 'order'])
    d = purchaseDetailSchema.parse(
      (
        await f
          .api()
          .post(`${f.path}/purchases/${d.order.id}/transitions`)
          .set(f.h)
          .send({
            action,
            version: d.order.version,
            reason: 'Approve damaged receipt test',
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body,
    );
  const path = `${f.path}/purchases/${d.order.id}/receipts`,
    input = {
      lineId: d.lines[0]!.id,
      quantity: '4',
      damaged: '1',
      damageReason: 'Crushed packaging on arrival',
      idempotencyKey: randomUUID(),
    };
  await f
    .api()
    .post(path)
    .set(f.h)
    .send({ ...input, lineId: randomUUID() })
    .expect(404);
  await f
    .api()
    .post(path)
    .set(f.h)
    .send({ ...input, locationId: randomUUID() })
    .expect(404);
  await f
    .api()
    .post(path)
    .set(f.h)
    .send({ ...input, damaged: '5' })
    .expect(400);
  d = purchaseDetailSchema.parse((await f.api().post(path).set(f.h).send(input).expect(201)).body);
  expect((await f.api().post(path).set(f.h).send(input).expect(201)).body).toEqual(d);
  expect(d.order.state).toBe('partially_received');
  expect(d.receipts[0]!.damaged).toBe('1.000000');
  expect(d.receipts[0]!.actorId).toBe(f.ownerId);
  expect(d.receipts[0]!.createdAt).toBeTruthy();
  const balance = (
    await f
      .db()
      .query(
        'SELECT on_hand::text,damaged::text FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND variant_id=$3',
        [f.a, f.warehouseA, f.variantId],
      )
  ).rows[0];
  expect(balance).toEqual({ on_hand: '14.000000', damaged: '1.000000' });
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
