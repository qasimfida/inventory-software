import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { countDetailSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('persists partial blind counts, deduplicates capture, rejects stock movement and applies approved recount exactly once', async () => {
  const f = fixture(),
    path = f.path + '/counts';
  let detail = countDetailSchema.parse(
    (
      await f
        .api()
        .post(path)
        .set(f.h)
        .send({
          warehouseId: f.warehouseA,
          blind: true,
          variantIds: [f.variantId],
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const id = detail.count.id;
  expect(detail.lines[0]!.expected).toBeNull();
  await f.api().get(`${path}/${id}`).set(native(f.otherToken)).expect(404);
  const command = {
    variantId: f.variantId,
    unitId: f.unitId,
    quantity: '8',
    version: detail.count.version,
    idempotencyKey: randomUUID(),
  };
  detail = countDetailSchema.parse(
    (await f.api().post(`${path}/${id}/capture`).set(f.h).send(command).expect(201)).body,
  );
  expect(
    (await f.api().post(`${path}/${id}/capture`).set(f.h).send(command).expect(201)).body,
  ).toEqual(detail);
  expect(detail.lines[0]!.attempt).toBe(1);
  detail = countDetailSchema.parse((await f.api().get(`${path}/${id}`).set(f.h).expect(200)).body);
  expect(detail.lines[0]!.counted).toBe('8.000000');
  detail = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${path}/${id}/submit`)
        .set(f.h)
        .send({
          version: detail.count.version,
          reason: 'Complete blind count review',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(detail.lines[0]!.expected).toBe('10.000000');
  await f
    .api()
    .post(`${f.path}/stock/movements`)
    .set(f.h)
    .send({
      variantId: f.variantId,
      unitId: f.unitId,
      warehouseId: f.warehouseA,
      type: 'receive',
      quantity: '1',
      reason: 'Movement during count',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  await f
    .api()
    .post(`${path}/${id}/approve`)
    .set(f.h)
    .send({
      version: detail.count.version,
      reason: 'Owner reviewed discrepancy',
      idempotencyKey: randomUUID(),
    })
    .expect(409);
  detail = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${path}/${id}/recount`)
        .set(f.h)
        .send({
          version: detail.count.version,
          reason: 'Recount after stock movement',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  expect(detail.lines[0]!.counted).toBeNull();
  detail = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${path}/${id}/capture`)
        .set(f.h)
        .send({ ...command, version: detail.count.version, idempotencyKey: randomUUID() })
        .expect(201)
    ).body,
  );
  detail = countDetailSchema.parse(
    (
      await f
        .api()
        .post(`${path}/${id}/submit`)
        .set(f.h)
        .send({
          version: detail.count.version,
          reason: 'Recount complete for review',
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  const approve = {
    version: detail.count.version,
    reason: 'Owner reviewed recount adjustments',
    idempotencyKey: randomUUID(),
  };
  detail = countDetailSchema.parse(
    (await f.api().post(`${path}/${id}/approve`).set(f.h).send(approve).expect(201)).body,
  );
  expect(detail.count.state).toBe('approved');
  expect(
    (await f.api().post(`${path}/${id}/approve`).set(f.h).send(approve).expect(201)).body,
  ).toEqual(detail);
  expect(
    (
      await f
        .db()
        .query(
          "SELECT quantity_delta::text FROM stock_movements WHERE business_id=$1 AND source_kind='stock_count' AND source_id=$2",
          [f.a, id],
        )
    ).rows,
  ).toEqual([{ quantity_delta: '-3.000000' }]);
  expect(
    (await f.api().get(`${f.path}/warehouses/${f.warehouseA}/reconciliation`).set(f.h).expect(200))
      .body.consistent,
  ).toBe(true);
});
it('resolves scoped exact product/location scans and rejects invalid or foreign locations', async () => {
  const f = fixture();
  const query = `?warehouseId=${f.warehouseA}`;
  const product = (
    await f.api().get(`${f.path}/scans${query}&kind=product&code=STOCK`).set(f.h).expect(200)
  ).body;
  expect(product.id).toBe(f.variantId);
  expect(product.units.some((u: { id: string }) => u.id === f.unitId)).toBe(true);
  expect(
    (await f.api().get(`${f.path}/scans${query}&kind=location&code=ROOT`).set(f.h).expect(200)).body
      .id,
  ).toBe(f.warehouseA);
  await f.api().get(`${f.path}/scans${query}&kind=location&code=missing`).set(f.h).expect(404);
  await f
    .api()
    .get(`${f.path}/scans${query}&kind=product&code=STOCK`)
    .set(native(f.otherToken))
    .expect(404);
  await f
    .api()
    .get(`${f.path}/sync/events${query}&currency=USD`)
    .set(native(f.otherToken))
    .expect(404);
  await f.api().get(`${f.path}/sync/events${query}&currency=USD`).set(f.h).expect(200);
});
