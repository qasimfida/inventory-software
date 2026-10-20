import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  leaseSchema,
  offlinePolicySchema,
  uploadResultSchema,
  deltaSchema,
} from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('defaults offline off, grants scoped leases and deduplicates lost-response batches after server commit', async () => {
  const f = fixture(),
    prepare = { warehouseId: f.warehouseA, currency: 'USD', deviceId: randomUUID() };
  await f.api().post(`${f.path}/sync/prepare`).set(f.h).send(prepare).expect(409);
  await f
    .api()
    .put(`${f.path}/sync/policy`)
    .set(f.h)
    .send(offlinePolicySchema.parse({ enabled: true }))
    .expect(200);
  const lease = leaseSchema.parse(
    (await f.api().post(`${f.path}/sync/prepare`).set(f.h).send(prepare).expect(201)).body,
  );
  expect(lease.snapshot.items).toHaveLength(1);
  expect(lease.actorId).toBe(f.ownerId);
  const op = {
    id: randomUUID(),
    leaseId: lease.id,
    occurredAt: new Date().toISOString(),
    kind: 'sale',
    lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '1' }],
    cashReceivedMinor: '1400',
    totalMinor: '1375',
  };
  const a = uploadResultSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sync/upload`)
        .set(f.h)
        .send({ operations: [op] })
        .expect(201)
    ).body,
  );
  expect(a.results[0]!.state).toBe('synced');
  const b = (
    await f
      .api()
      .post(`${f.path}/sync/upload`)
      .set(f.h)
      .send({ operations: [op] })
      .expect(201)
  ).body;
  expect(b).toEqual(a);
  expect(
    (await f.db().query('SELECT count(*) FROM sales WHERE business_id=$1', [f.a])).rows[0]!.count,
  ).toBe('1');
  await f
    .api()
    .post(`${f.path}/sync/upload`)
    .set(f.h)
    .send({ operations: [{ ...op, totalMinor: '1' }] })
    .expect(409);
  await f
    .api()
    .get(
      `${f.path}/sync/delta?warehouseId=${f.warehouseA}&currency=USD&cursor=${lease.snapshot.cursor}`,
    )
    .set(native(f.otherToken))
    .expect(404);
  const delta = deltaSchema.parse(
    (
      await f
        .api()
        .get(
          `${f.path}/sync/delta?warehouseId=${f.warehouseA}&currency=USD&cursor=${lease.snapshot.cursor}`,
        )
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(BigInt(delta.revision)).toBeGreaterThan(BigInt(lease.snapshot.revision));
  expect(delta.items[0]!.available).toBe('9.000000');
  await f
    .db()
    .query("UPDATE sync_cursors SET expires_at=now()-interval '1 day' WHERE id=$1", [delta.cursor]);
  const reset = deltaSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/sync/delta?warehouseId=${f.warehouseA}&currency=USD&cursor=${delta.cursor}`)
        .set(f.h)
        .expect(200)
    ).body,
  );
  expect(reset.reset).toBe(true);
  expect(reset.replaceAll).toBe(true);
});
it('retains stock/price conflicts without partial writes and rejects expired offline permission', async () => {
  const f = fixture(),
    lease = leaseSchema.parse(
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
    .post(`${f.path}/prices`)
    .set(f.h)
    .send({
      variantId: f.variantId,
      unitPrice: '20',
      currency: 'USD',
      taxBasisPoints: 1000,
      taxInclusive: false,
      startsAt: '2026-02-01T00:00:00.000Z',
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
  const response = (
    await f
      .api()
      .post(`${f.path}/sync/upload`)
      .set(f.h)
      .send({ operations: [op] })
      .expect(201)
  ).body;
  expect(response.results[0].state).toBe('conflict');
  expect(
    (
      await f
        .api()
        .post(`${f.path}/sync/upload`)
        .set(f.h)
        .send({ operations: [op] })
        .expect(201)
    ).body,
  ).toEqual(response);
  expect(
    (await f.db().query('SELECT count(*) FROM sales WHERE business_id=$1', [f.a])).rows[0]!.count,
  ).toBe('1');
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
