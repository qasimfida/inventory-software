import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { companyProfileSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('saves company branding with permission, version and tenant isolation', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/settings`;
  const values = {
    company: companyProfileSchema.parse({
      displayName: 'Acme',
      palette: ['teal'],
      website: 'https://example.com',
    }),
    defaults: { accent: 'teal' },
  };
  await f.api().put(path).set(native(f.viewerToken)).send({ version: 0, values }).expect(403);
  await f.api().put(path).set(native(f.otherToken)).send({ version: 0, values }).expect(404);
  const saved = await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({ version: 0, values })
    .expect(200);
  expect(saved.body.values.company.displayName).toBe('Acme');
  await f.api().put(path).set(native(f.ownerToken)).send({ version: 0, values }).expect(409);
  await f
    .api()
    .put(path)
    .set(native(f.ownerToken))
    .send({
      version: 1,
      values: {
        ...values,
        company: { ...values.company, logo: 'data:image/svg+xml;base64,PHN2Zz4=' },
      },
    })
    .expect(400);
  const read = await f.api().get(path).set(native(f.viewerToken)).expect(200);
  expect(read.body.values.company.palette).toEqual(['teal']);
});
it('aggregates chosen warehouses without crossing tenant or membership scope', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`;
  const second = (
    await f
      .api()
      .post(`${path}/locations`)
      .set(native(f.ownerToken))
      .send({ kind: 'warehouses', name: 'Second', code: 'SECOND', storeId: f.storeA })
      .expect(201)
  ).body.id as string;
  for (const [warehouseId, quantity] of [
    [f.warehouseA, '2'],
    [second, '3'],
  ])
    await f
      .api()
      .post(`${path}/stock/movements`)
      .set(native(f.ownerToken))
      .send({
        warehouseId,
        quantity,
        variantId: f.variantId,
        unitId: f.unitId,
        type: 'opening',
        reason: 'Multi-location test',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
  const query = { warehouseId: f.warehouseA, warehouseIds: [f.warehouseA, second].join(',') };
  const result = await f
    .api()
    .get(`${path}/stock/overview`)
    .query(query)
    .set(native(f.ownerToken))
    .expect(200);
  expect(Number(result.body.items[0].available)).toBe(5);
  const individual = await f
    .api()
    .get(`${path}/stock/overview`)
    .query({ ...query, warehouseIds: second })
    .set(native(f.ownerToken))
    .expect(200);
  expect(Number(individual.body.items[0].available)).toBe(3);
  await f
    .api()
    .get(`${path}/stock/overview`)
    .query({ ...query, warehouseIds: randomUUID() })
    .set(native(f.ownerToken))
    .expect(404);
  await f.api().get(`${path}/stock/overview`).query(query).set(native(f.otherToken)).expect(404);
  await f
    .api()
    .get(`${path}/stock/overview`)
    .query({ ...query, warehouseIds: 'invalid' })
    .set(native(f.ownerToken))
    .expect(400);
  await f
    .db()
    .query(
      "UPDATE business_memberships SET role='custom',permissions=ARRAY['stock.read','reports.read'],scope_store_id=$3,scope_warehouse_id=$4 WHERE business_id=$1 AND account_id=$2",
      [f.a, f.managerId, f.storeA, f.warehouseA],
    );
  expect([403, 404]).toContain(
    (await f.api().get(`${path}/stock/overview`).query(query).set(native(f.managerToken))).status,
  );
  expect([403, 404]).toContain(
    (
      await f
        .api()
        .get(`${path}/reports/overview`)
        .query({ warehouseIds: second })
        .set(native(f.managerToken))
    ).status,
  );
  const aggregate = await f
    .api()
    .get(`${path}/reports/overview`)
    .query({ warehouseIds: query.warehouseIds })
    .set(native(f.ownerToken))
    .expect(200);
  expect(Number(aggregate.body.inventory.items[0].available)).toBe(5);
  for (const id of [f.warehouseA, second])
    expect(
      (
        await f
          .api()
          .get(`${path}/warehouses/${id}/reconciliation`)
          .set(native(f.ownerToken))
          .expect(200)
      ).body.consistent,
    ).toBe(true);
});
it('filters customers before pagination and retains tenant checks', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}/customers`;
  for (const [code, state, currency] of [
    ['ACTIVE', 'active', 'USD'],
    ['INACTIVE', 'inactive', 'PKR'],
  ])
    await f
      .api()
      .post(path)
      .set(native(f.ownerToken))
      .send({
        storeId: f.storeA,
        code,
        name: code,
        currency,
        state,
        email: '',
        phone: '',
        address: '',
        notes: '',
      })
      .expect(201);
  const filtered = await f
    .api()
    .get(path)
    .query({ storeId: f.storeA, state: 'inactive', currency: 'PKR' })
    .set(native(f.ownerToken))
    .expect(200);
  expect(filtered.body.customers.map((c: { code: string }) => c.code)).toEqual(['INACTIVE']);
  const empty = await f
    .api()
    .get(path)
    .query({ storeId: f.storeA, state: 'active', currency: 'PKR' })
    .set(native(f.ownerToken))
    .expect(200);
  expect(empty.body.customers).toEqual([]);
  await f
    .api()
    .get(path)
    .query({ storeId: f.storeA, state: 'unknown' })
    .set(native(f.ownerToken))
    .expect(400);
  await f.api().get(path).query({ storeId: f.storeA }).set(native(f.otherToken)).expect(404);
});
