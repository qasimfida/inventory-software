import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { warehouseViewSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('shows only real scoped storage and paginated children with exact per-location stock', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    h = native(f.ownerToken);
  const empty = warehouseViewSchema.parse(
    (
      await f
        .api()
        .get(`${path}/warehouse-view`)
        .query({ warehouseId: f.warehouseA })
        .set(h)
        .expect(200)
    ).body,
  );
  expect(empty.node.id).toBe(f.warehouseA);
  expect(empty.children).toEqual([]);
  expect(empty.stock).toEqual([]);
  const bin = (
    await f
      .api()
      .post(`${path}/storage`)
      .set(h)
      .send({
        warehouseId: f.warehouseA,
        parentId: f.warehouseA,
        name: 'Real bin',
        code: 'BIN-1',
        type: 'bin',
      })
      .expect(201)
  ).body.id as string;
  await f
    .api()
    .post(`${path}/stock/movements`)
    .set(h)
    .send({
      warehouseId: f.warehouseA,
      locationId: bin,
      variantId: f.variantId,
      unitId: f.unitId,
      quantity: '1.5',
      type: 'opening',
      reason: 'Counted bin stock',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const root = warehouseViewSchema.parse(
    (
      await f
        .api()
        .get(`${path}/warehouse-view`)
        .query({ warehouseId: f.warehouseA })
        .set(h)
        .expect(200)
    ).body,
  );
  expect(root.children[0]?.id).toBe(bin);
  expect(root.stock).toEqual([]);
  const leaf = warehouseViewSchema.parse(
    (
      await f
        .api()
        .get(`${path}/warehouse-view`)
        .query({ warehouseId: f.warehouseA, locationId: bin })
        .set(h)
        .expect(200)
    ).body,
  );
  expect(leaf.stock[0]).toMatchObject({
    onHand: '1.500000',
    available: '1.500000',
    sku: 'STOCK',
    low: false,
  });
  await f
    .api()
    .get(`${path}/warehouse-view`)
    .query({ warehouseId: f.warehouseA, locationId: randomUUID() })
    .set(h)
    .expect(404);
  await f
    .api()
    .get(`${path}/warehouse-view`)
    .query({ warehouseId: f.warehouseA })
    .set(native(f.otherToken))
    .expect(404);
  await f
    .api()
    .get(`${path}/warehouse-view`)
    .query({ warehouseId: f.warehouseA })
    .set(native(f.viewerToken))
    .expect(403);
  await f
    .api()
    .get(`${path}/warehouse-view`)
    .query({ warehouseId: f.warehouseA, offset: -1 })
    .set(h)
    .expect(400);
});
