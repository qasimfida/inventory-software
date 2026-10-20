import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { leaseSchema, uploadResultSchema, offlinePolicySchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('retains a globally depleted sale and rejects an operation outside its offline lifetime', async () => {
  const f = fixture();
  await f
    .api()
    .put(`${f.path}/sync/policy`)
    .set(f.h)
    .send(offlinePolicySchema.parse({ enabled: true }))
    .expect(200);
  const lease = leaseSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sync/prepare`)
        .set(f.h)
        .send({ warehouseId: f.warehouseA, currency: 'USD', deviceId: randomUUID() })
        .expect(201)
    ).body,
  );
  await f
    .api()
    .post(`${f.path}/stock/movements`)
    .set(f.h)
    .send({
      variantId: f.variantId,
      unitId: f.unitId,
      warehouseId: f.warehouseA,
      type: 'adjustment_out',
      quantity: '10',
      reason: 'Another terminal consumed stock',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const op = {
    id: randomUUID(),
    leaseId: lease.id,
    occurredAt: new Date().toISOString(),
    kind: 'sale',
    lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '1' }],
    cashReceivedMinor: '1375',
    totalMinor: '1375',
  };
  const result = uploadResultSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sync/upload`)
        .set(f.h)
        .send({
          operations: [
            op,
            {
              ...op,
              id: randomUUID(),
              occurredAt: new Date(Date.parse(lease.expiresAt) + 1000).toISOString(),
            },
          ],
        })
        .expect(201)
    ).body,
  );
  expect(result.results.map((r) => r.state)).toEqual(['conflict', 'conflict']);
  expect(
    (await f.db().query('SELECT count(*) FROM sales WHERE business_id=$1', [f.a])).rows[0]!.count,
  ).toBe('0');
});
