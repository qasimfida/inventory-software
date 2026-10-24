import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { stockOverviewSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('includes zero-balance active SKUs and returns exact filtered counts and bounded pages', async () => {
  const { api, root, a, ownerToken, warehouseA } = fixture();
  const response = await api()
    .get(`${root}/${a}/stock/overview?warehouseId=${warehouseA}&status=out-of-stock&limit=1`)
    .set(native(ownerToken))
    .expect(200);
  const page = stockOverviewSchema.parse(response.body);
  expect(page.counts).toEqual({ all: 1, 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 1 });
  expect(page.items[0]).toMatchObject({ available: '0', status: 'out-of-stock' });
  expect(page.total).toBe(1);
  const empty = await api()
    .get(`${root}/${a}/stock/overview?warehouseId=${warehouseA}&search=missing`)
    .set(native(ownerToken))
    .expect(200);
  expect(empty.body.items).toEqual([]);
  expect(empty.body.counts.all).toBe(1);
  expect(empty.body.total).toBe(0);
});
it('uses the business threshold without changing the auditable ledger', async () => {
  const { api, root, a, ownerToken, warehouseA, variantId, unitId } = fixture();
  await api()
    .put(`${root}/${a}/settings`)
    .set(native(ownerToken))
    .send({
      version: 0,
      values: { industry: { schemaVersion: 1, kind: 'general', lowStockThreshold: '5' } },
    })
    .expect(200);
  await api()
    .post(`${root}/${a}/stock/movements`)
    .set(native(ownerToken))
    .send({
      variantId,
      unitId,
      warehouseId: warehouseA,
      type: 'opening',
      quantity: '5',
      reason: 'Overview threshold test',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const page = stockOverviewSchema.parse(
    (
      await api()
        .get(`${root}/${a}/stock/overview?warehouseId=${warehouseA}&status=low-stock`)
        .set(native(ownerToken))
        .expect(200)
    ).body,
  );
  expect(page.counts['low-stock']).toBe(1);
  expect(page.counts['out-of-stock']).toBe(0);
  expect(page.items[0]?.status).toBe('low-stock');
  await api()
    .post(`${root}/${a}/stock/movements`)
    .set(native(ownerToken))
    .send({
      variantId,
      unitId,
      warehouseId: warehouseA,
      type: 'receive',
      quantity: '1',
      reason: 'Above threshold test',
      idempotencyKey: randomUUID(),
    })
    .expect(201);
  const stocked = stockOverviewSchema.parse(
    (
      await api()
        .get(`${root}/${a}/stock/overview?warehouseId=${warehouseA}&status=in-stock`)
        .set(native(ownerToken))
        .expect(200)
    ).body,
  );
  expect(stocked.counts['in-stock']).toBe(1);
  const reconciliation = await api()
    .get(`${root}/${a}/warehouses/${warehouseA}/reconciliation`)
    .set(native(ownerToken))
    .expect(200);
  expect(reconciliation.body.consistent).toBe(true);
});
it('rejects unauthenticated, cross-tenant and malformed queries', async () => {
  const { api, root, a, b, ownerToken, otherToken, warehouseA } = fixture();
  const path = `${root}/${a}/stock/overview?warehouseId=${warehouseA}`;
  await api().get(path).expect(401);
  expect([403, 404]).toContain((await api().get(path).set(native(otherToken))).status);
  expect([403, 404]).toContain(
    (
      await api()
        .get(`${root}/${b}/stock/overview?warehouseId=${warehouseA}`)
        .set(native(ownerToken))
    ).status,
  );
  await api()
    .get(path + '&status=invalid')
    .set(native(ownerToken))
    .expect(400);
  await api()
    .get(path + '&limit=1000')
    .set(native(ownerToken))
    .expect(400);
});
