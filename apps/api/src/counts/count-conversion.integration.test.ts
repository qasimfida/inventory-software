import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { countDetailSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('accepts explicit zero and converts carton counts without changing stock before approval', async () => {
  const f = fixture();
  const box = (
    await f
      .api()
      .post(`${f.path}/units`)
      .set(f.h)
      .send({ name: 'Count carton', code: 'COUNTBOX', dimension: 'count' })
      .expect(201)
  ).body;
  await f
    .api()
    .post(`${f.path}/variants/${f.variantId}/conversions`)
    .set(f.h)
    .send({ unitId: box.id, numerator: '12', denominator: '1' })
    .expect(201);
  let d = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/counts`)
        .set(f.h)
        .send({
          warehouseId: f.warehouseA,
          variantIds: [f.variantId],
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  d = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/counts/${d.count.id}/capture`)
        .set(f.h)
        .send({
          variantId: f.variantId,
          unitId: box.id,
          quantity: '2',
          version: d.count.version,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(d.lines[0]!.counted).toBe('24.000000');
  d = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/counts/${d.count.id}/capture`)
        .set(f.h)
        .send({
          variantId: f.variantId,
          unitId: box.id,
          quantity: '0',
          version: d.count.version,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(d.lines[0]!.counted).toBe('0.000000');
  expect(
    (
      await f
        .db()
        .query(
          'SELECT on_hand::text FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND variant_id=$3',
          [f.a, f.warehouseA, f.variantId],
        )
    ).rows[0]!.on_hand,
  ).toBe('10.000000');
});
